package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var lineRE = regexp.MustCompile(`^(?:(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) )?dns query from (.+?): #([0-9]+) ([^ ]+)\. (\w+(?: \(\d+\))?)$`)
var doneRE = regexp.MustCompile(`^(?:(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) )?dns done query: #([0-9]+) (?:([^ ]+\.) (.+)|(.+))$`)

// Store pending queries by hash ID
var pendingQueries = make(map[string]int64)

func prepareDB(db *sql.DB) {
	db.Exec(`PRAGMA journal_mode = WAL`)
	db.Exec(`CREATE TABLE IF NOT EXISTS queries(
        id INTEGER PRIMARY KEY,
        timestamp INTEGER,
        client TEXT,
        domain TEXT,
        type TEXT,
        blocked INTEGER,
        result TEXT
    )`)
	
	// Add result column if it doesn't exist (for existing databases)
	db.Exec(`ALTER TABLE queries ADD COLUMN result TEXT`)
}

func purgeOld(db *sql.DB) {
	cutoff := time.Now().Add(-24 * time.Hour).Unix()
	if _, err := db.Exec(`DELETE FROM queries WHERE timestamp < ?`, cutoff); err != nil {
		log.Printf("Error purging old records: %v", err)
	}
}

func handleLine(db *sql.DB, line string) {
	// Try to match query pattern first
	m := lineRE.FindStringSubmatch(line)
	if m != nil {
		handleQuery(db, m)
		return
	}
	
	// Try to match done pattern
	d := doneRE.FindStringSubmatch(line)
	if d != nil {
		handleDone(db, d)
		return
	}
	
	log.Printf("Unparsed line: %s", line)
}

func handleQuery(db *sql.DB, m []string) {
	tsStr := m[1]
	var ts time.Time
	if tsStr != "" {
		if t, err := time.Parse("2006-01-02 15:04:05", tsStr); err == nil {
			ts = t
		} else {
			ts = time.Now()
		}
	} else {
		ts = time.Now()
	}
	client := m[2]
	hashID := m[3]
	domain := m[4]
	qtypeRaw := m[5]
	qtype := strings.Fields(qtypeRaw)[0]
	blocked := 0
	
	// Handle UNKNOWN type with number in brackets
	if strings.HasPrefix(qtypeRaw, "UNKNOWN") {
		qtype, blocked = resolveUnknownType(qtypeRaw)
	}
	
	// Insert query into database and store the ID for later correlation
	result, err := db.Exec(`INSERT INTO queries(timestamp, client, domain, type, blocked) VALUES(?,?,?,?,?)`,
		ts.Unix(), client, domain, qtype, blocked)
	if err != nil {
		log.Printf("DB insert error: %v", err)
	} else {
		if id, err := result.LastInsertId(); err == nil {
			// Store the database row ID with the hash ID for correlation
			pendingQueries[hashID] = id
		}
		log.Printf("Logged query: %s %s %s blocked=%d hash=%s", client, domain, qtype, blocked, hashID)
	}
}

func handleDone(db *sql.DB, d []string) {
	hashID := d[2]
	var result *string
	
	// Check if it's a successful query with domain + result (group 4) or just an error message (group 5)
	if d[4] != "" {
		// Format: "domain.name. result" -> we want just the result
		result = &d[4]
	} else if d[5] != "" {
		// Format: "error message" -> store as NULL
		result = nil
	} else {
		log.Printf("Could not parse done result for hash %s", hashID)
		return
	}
	
	// Look up the pending query by hash ID
	if rowID, exists := pendingQueries[hashID]; exists {
		// Update the query with the actual result (don't change blocked status)
		_, err := db.Exec(`UPDATE queries SET result = ? WHERE id = ?`, result, rowID)
		if err != nil {
			log.Printf("DB update error for hash %s: %v", hashID, err)
		} else {
			if result != nil {
				log.Printf("Updated query result for hash %s: %s", hashID, *result)
			} else {
				log.Printf("Updated query result for hash %s: NULL (error)", hashID)
			}
		}
		// Remove from pending queries
		delete(pendingQueries, hashID)
	} else {
		log.Printf("No pending query found for hash %s", hashID)
	}
}

func resolveUnknownType(qtypeRaw string) (string, int) {
	// Try to extract and parse the DNS type number
	num := extractDNSTypeNumber(qtypeRaw)
	if num == -1 {
		return "UNKNOWN", 1 // Parsing failed
	}
	
	// Try to resolve the DNS type
	resolvedType := getDNSTypeName(num)
	blocked := 0
	if resolvedType == "UNKNOWN" {
		blocked = 1
	}
	
	return resolvedType, blocked
}

func extractDNSTypeNumber(qtypeRaw string) int {
	start := strings.Index(qtypeRaw, "(")
	end := strings.Index(qtypeRaw, ")")
	
	if start == -1 || end == -1 || start >= end-1 {
		return -1
	}
	
	numStr := qtypeRaw[start+1 : end]
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return -1
	}
	
	return num
}

func getDNSTypeName(typeNum int) string {
	dnsTypes := map[int]string{
		1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA",
		33: "SRV", 35: "NAPTR", 39: "DNAME", 41: "OPT", 43: "DS", 46: "RRSIG", 47: "NSEC",
		48: "DNSKEY", 50: "NSEC3", 51: "NSEC3PARAM", 52: "TLSA", 53: "SMIMEA", 55: "HIP",
		59: "CDS", 60: "CDNSKEY", 61: "OPENPGPKEY", 62: "CSYNC", 63: "ZONEMD", 64: "SVCB",
		65: "HTTPS", 99: "SPF", 108: "EUI48", 109: "EUI64", 257: "CAA",
	}
	
	if name, exists := dnsTypes[typeNum]; exists {
		return name
	}
	return "UNKNOWN"
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}

func serveAPI(db *sql.DB, httpPort int) {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/top-domains", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`
            SELECT domain, COUNT(*) as cnt
            FROM queries
            WHERE blocked=0 AND timestamp >= strftime('%s','now')-86400
            GROUP BY domain
            ORDER BY cnt DESC
            LIMIT 20`)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var out []struct {
			Domain string `json:"domain"`
			Count  int    `json:"count"`
		}
		for rows.Next() {
			var d string
			var c int
			rows.Scan(&d, &c)
			out = append(out, struct {
				Domain string `json:"domain"`
				Count  int    `json:"count"`
			}{d, c})
		}
		json.NewEncoder(w).Encode(out)
	})

	mux.HandleFunc("/api/query-types", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`
            SELECT type, COUNT(*) AS cnt
            FROM queries
            WHERE timestamp >= strftime('%s','now')-86400
            GROUP BY type
            ORDER BY cnt DESC`)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var out []struct {
			Type  string `json:"type"`
			Count int    `json:"count"`
		}
		for rows.Next() {
			var t string
			var c int
			rows.Scan(&t, &c)
			out = append(out, struct {
				Type  string `json:"type"`
				Count int    `json:"count"`
			}{t, c})
		}
		json.NewEncoder(w).Encode(out)
	})

	mux.HandleFunc("/api/blocked-domains", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`
            SELECT domain, COUNT(*) as cnt
            FROM queries
            WHERE blocked=1 AND timestamp >= strftime('%s','now')-86400
            GROUP BY domain
            ORDER BY cnt DESC
            LIMIT 20`)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var out []struct {
			Domain string `json:"domain"`
			Count  int    `json:"count"`
		}
		for rows.Next() {
			var d string
			var c int
			rows.Scan(&d, &c)
			out = append(out, struct {
				Domain string `json:"domain"`
				Count  int    `json:"count"`
			}{d, c})
		}
		json.NewEncoder(w).Encode(out)
	})

	mux.HandleFunc("/api/clients", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`
            SELECT client, COUNT(*) as cnt
            FROM queries
            WHERE timestamp >= strftime('%s','now')-86400
            GROUP BY client
            ORDER BY cnt DESC
            LIMIT 20`)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var out []struct {
			Client string `json:"client"`
			Count  int    `json:"count"`
		}
		for rows.Next() {
			var cip string
			var cnt int
			rows.Scan(&cip, &cnt)
			out = append(out, struct {
				Client string `json:"client"`
				Count  int    `json:"count"`
			}{cip, cnt})
		}
		json.NewEncoder(w).Encode(out)
	})

	mux.HandleFunc("/api/client-queries", func(w http.ResponseWriter, r *http.Request) {
		client := r.URL.Query().Get("client")
		if client == "" {
			http.Error(w, "client query param required", http.StatusBadRequest)
			return
		}
		page := 1
		if p := r.URL.Query().Get("page"); p != "" {
			if n, err := strconv.Atoi(p); err == nil && n > 0 {
				page = n
			}
		}
		pageSize := 20
		if ps := r.URL.Query().Get("page_size"); ps != "" {
			if n, err := strconv.Atoi(ps); err == nil && n > 0 {
				pageSize = n
			}
		}
		offset := (page - 1) * pageSize

		rows, err := db.Query(`
            SELECT timestamp, domain, type, blocked
            FROM queries
            WHERE client = ? AND timestamp >= strftime('%s','now')-86400
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?`, client, pageSize, offset)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var out []struct {
			Timestamp int64  `json:"timestamp"`
			Domain    string `json:"domain"`
			Type      string `json:"type"`
			Blocked   int    `json:"blocked"`
		}
		for rows.Next() {
			var ts int64
			var d, t string
			var b int
			rows.Scan(&ts, &d, &t, &b)
			out = append(out, struct {
				Timestamp int64  `json:"timestamp"`
				Domain    string `json:"domain"`
				Type      string `json:"type"`
				Blocked   int    `json:"blocked"`
			}{ts, d, t, b})
		}
		json.NewEncoder(w).Encode(out)
	})

	mux.Handle("/", http.FileServer(http.Dir("./page")))

	loggedMux := loggingMiddleware(mux)
	
	addr := ":" + strconv.Itoa(httpPort)
	
	log.Printf("Starting HTTP server on %s", addr)
	log.Fatal(http.ListenAndServe(addr, loggedMux))
}

func main() {
	// Parse command line flags
	httpPort := flag.Int("httpport", 8080, "HTTP server port")
	dnsPort := flag.Int("dnsport", 5354, "DNS UDP listener port")
	logRaw := flag.Bool("lograw", false, "Log raw UDP data to file")
	flag.Parse()

	// Check environment variables if flags weren't explicitly set
	httpPortSet := false
	dnsPortSet := false
	logRawSet := false
	flag.Visit(func(f *flag.Flag) {
		if f.Name == "httpport" {
			httpPortSet = true
		}
		if f.Name == "dnsport" {
			dnsPortSet = true
		}
		if f.Name == "lograw" {
			logRawSet = true
		}
	})

	if !httpPortSet {
		if port := os.Getenv("HTTPPORT"); port != "" {
			if p, err := strconv.Atoi(port); err == nil {
				*httpPort = p
			}
		}
	}
	if !dnsPortSet {
		if port := os.Getenv("DNSPORT"); port != "" {
			if p, err := strconv.Atoi(port); err == nil {
				*dnsPort = p
			}
		}
	}
	if !logRawSet {
		if raw := os.Getenv("LOGRAW"); raw != "" {
			if raw == "true" || raw == "1" {
				*logRaw = true
			}
		}
	}

	// Create data directory if it doesn't exist
	if err := os.MkdirAll("./data", 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}
	
	db, err := sql.Open("sqlite3", "./data/dnslogs.db")
	if err != nil {
		log.Fatal(err)
	}
	prepareDB(db)

	go func() {
		for {
			time.Sleep(time.Hour)
			purgeOld(db)
		}
	}()

	go func() {
		dnsAddr := ":" + strconv.Itoa(*dnsPort)
		
		addr, _ := net.ResolveUDPAddr("udp", dnsAddr)
		conn, err := net.ListenUDP("udp", addr)
		if err != nil {
			log.Fatalf("Failed to listen UDP: %v", err)
		}
		defer conn.Close()
		log.Printf("Listening for UDP on %s", dnsAddr)

		var rawLogFile *os.File
		if *logRaw {
			rawLogFile, err = os.OpenFile("./data/raw_udp.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
			if err != nil {
				log.Printf("Failed to open raw log file: %v", err)
			} else {
				defer rawLogFile.Close()
				log.Printf("Raw UDP logging enabled: ./data/raw_udp.log")
			}
		}

		buf := make([]byte, 65535)
		for {
			n, _, err := conn.ReadFromUDP(buf)
			if err != nil {
				log.Printf("Error reading UDP: %v", err)
				continue
			}
			data := string(buf[:n])
			
			// Log raw data if enabled
			if *logRaw && rawLogFile != nil {
				timestamp := time.Now().Format("2006-01-02 15:04:05")
				rawLogFile.WriteString(fmt.Sprintf("[%s] %s\n", timestamp, data))
			}
			
			for line := range strings.SplitSeq(strings.TrimRight(data, "\n"), "\n") {
				handleLine(db, line)
			}
		}
	}()

	serveAPI(db, *httpPort)
}
