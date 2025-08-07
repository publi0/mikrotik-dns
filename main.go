package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var lineRE = regexp.MustCompile(`^(?:(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) )?dns query from (.+?): #[0-9]+ ([^ ]+)\. (\w+(?: \(\d+\))?)$`)

func prepareDB(db *sql.DB) {
	db.Exec(`PRAGMA journal_mode = WAL`)
	db.Exec(`CREATE TABLE IF NOT EXISTS queries(
        id INTEGER PRIMARY KEY,
        timestamp INTEGER,
        client TEXT,
        domain TEXT,
        type TEXT,
        blocked INTEGER
    )`)
}

func purgeOld(db *sql.DB) {
	cutoff := time.Now().Add(-24 * time.Hour).Unix()
	if _, err := db.Exec(`DELETE FROM queries WHERE timestamp < ?`, cutoff); err != nil {
		log.Printf("Error purging old records: %v", err)
	}
}

func handleLine(db *sql.DB, line string) {
	m := lineRE.FindStringSubmatch(line)
	if m == nil {
		log.Printf("Unparsed line: %s", line)
		return
	}
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
	domain := m[3]
	qtypeRaw := m[4]

	if qtypeRaw == "" {
		qtypeRaw = "UNKNOWN"
	} else if strings.HasPrefix(qtypeRaw, "UNKNOWN") {
		qtypeRaw = resolveUnknownType(line)
	}

	blocked := 0
	if strings.HasPrefix(qtypeRaw, "UNKNOWN") {
		log.Printf("Unknown type: [%s]", line)
		blocked = 1
	}
	if _, err := db.Exec(`INSERT INTO queries(timestamp, client, domain, type, blocked) VALUES(?,?,?,?,?)`,
		ts.Unix(), client, domain, qtypeRaw, blocked); err != nil {
		log.Printf("DB insert error: %v", err)
	} else {
		log.Printf("Logged query: %s %s %s blocked=%d", client, domain, qtypeRaw, blocked)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}

func serveAPI(db *sql.DB) {
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
	log.Println("Starting HTTP server on :8080")
	log.Fatal(http.ListenAndServe(":8080", loggedMux))
}

func main() {
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
		addr, _ := net.ResolveUDPAddr("udp", ":5354")
		conn, err := net.ListenUDP("udp", addr)
		if err != nil {
			log.Fatalf("Failed to listen UDP: %v", err)
		}
		defer conn.Close()
		log.Println("Listening for UDP on :5354")

		buf := make([]byte, 65535)
		for {
			n, _, err := conn.ReadFromUDP(buf)
			if err != nil {
				log.Printf("Error reading UDP: %v", err)
				continue
			}
			data := string(buf[:n])
			for line := range strings.SplitSeq(strings.TrimRight(data, "\n"), "\n") {
				handleLine(db, line)
			}
		}
	}()

	serveAPI(db)
}

func resolveUnknownType(qtypeRaw string) string {
	num, err := extractDNSTypeNumber(qtypeRaw)
	if err != nil {
		return "UNKNOWN"
	}
	return getDNSTypeName(num)
}

func extractDNSTypeNumber(qtypeRaw string) (int, error) {
	start := strings.Index(qtypeRaw, "(")
	end := strings.Index(qtypeRaw, ")")

	if start == -1 || end == -1 || start >= end-1 {
		return 0, errors.New("invalid DNS type format")
	}

	numStr := qtypeRaw[start+1 : end]
	num, err := strconv.Atoi(numStr)
	if err != nil {
		return 0, errors.New("invalid DNS type number")
	}

	return num, nil
}

func getDNSTypeName(typeNum int) string {
	dnsTypes := map[int]string{
		1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA",
		33: "SRV", 35: "NAPTR", 39: "DNAME", 41: "OPT", 43: "DS", 46: "RRSIG", 47: "NSEC",
		48: "DNSKEY", 50: "NSEC3", 51: "NSEC3PARAM", 52: "TLSA", 53: "SMIMEA", 55: "HIP",
		59: "CDS", 60: "CDNSKEY", 61: "OPENPGPKEY", 62: "CSYNC", 63: "ZONEMD", 64: "SVCB",
		65: "HTTPS", 99: "SPF", 108: "EUI48", 109: "EUI64", 257: "CAA",
	}
	if name, ok := dnsTypes[typeNum]; ok {
		return name
	}
	return "UNKNOWN"
}
