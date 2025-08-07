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
        type TEXT
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

	if strings.HasPrefix(qtypeRaw, "UNKNOWN") {
		log.Printf("Unknown type: [%s]", line)
	}
	if _, err := db.Exec(`INSERT INTO queries(timestamp, client, domain, type) VALUES(?,?,?,?)`,
		ts.Unix(), client, domain, qtypeRaw); err != nil {
		log.Printf("DB insert error: %v", err)
	} else {
		log.Printf("Logged query: %s %s %s", client, domain, qtypeRaw)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

func serveAPI(db *sql.DB) {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/top-domains", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`
            SELECT domain, COUNT(*) as cnt
            FROM queries
            WHERE timestamp >= strftime('%s','now')-86400
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

	mux.HandleFunc("/api/unique-clients-count", func(w http.ResponseWriter, r *http.Request) {
		var count int
		err := db.QueryRow(`
        SELECT COUNT(DISTINCT client)
        FROM queries
        WHERE timestamp >= strftime('%s','now')-86400`).Scan(&count)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(struct {
			Count int `json:"count"`
		}{count})
	})

	mux.HandleFunc("/api/unique-domains-count", func(w http.ResponseWriter, r *http.Request) {
		var count int
		err := db.QueryRow(`
        SELECT COUNT(DISTINCT domain)
        FROM queries
        WHERE timestamp >= strftime('%s','now')-86400`).Scan(&count)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(struct {
			Count int `json:"count"`
		}{count})
	})

	mux.HandleFunc("/api/all-queries", func(w http.ResponseWriter, r *http.Request) {
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
        SELECT timestamp, client, domain, type
        FROM queries
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?`, pageSize, offset)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var out []struct {
			Timestamp int64  `json:"timestamp"`
			Client    string `json:"client"`
			Domain    string `json:"domain"`
			Type      string `json:"type"`
		}
		for rows.Next() {
			var ts int64
			var c, d, t string
			rows.Scan(&ts, &c, &d, &t)
			out = append(out, struct {
				Timestamp int64  `json:"timestamp"`
				Client    string `json:"client"`
				Domain    string `json:"domain"`
				Type      string `json:"type"`
			}{ts, c, d, t})
		}
		json.NewEncoder(w).Encode(out)
	})

	mux.HandleFunc("/api/domain-queries", func(w http.ResponseWriter, r *http.Request) {
		domain := r.URL.Query().Get("domain")
		if domain == "" {
			http.Error(w, "domain query param required", http.StatusBadRequest)
			return
		}
		partial := r.URL.Query().Get("partial") == "true"
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

		var rows *sql.Rows
		var err error
		if partial {
			likePattern := "%" + domain + "%"
			rows, err = db.Query(`
        SELECT timestamp, client, domain, type
        FROM queries
        WHERE domain LIKE ? AND timestamp >= strftime('%s','now')-86400
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?`, likePattern, pageSize, offset)
		} else {
			rows, err = db.Query(`
        SELECT timestamp, client, domain, type
        FROM queries
        WHERE domain = ? AND timestamp >= strftime('%s','now')-86400
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?`, domain, pageSize, offset)
		}
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var out []struct {
			Timestamp int64  `json:"timestamp"`
			Client    string `json:"client"`
			Domain    string `json:"domain"`
			Type      string `json:"type"`
		}
		for rows.Next() {
			var ts int64
			var c, d, t string
			rows.Scan(&ts, &c, &d, &t)
			out = append(out, struct {
				Timestamp int64  `json:"timestamp"`
				Client    string `json:"client"`
				Domain    string `json:"domain"`
				Type      string `json:"type"`
			}{ts, c, d, t})
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
            SELECT timestamp, domain, type
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
		}
		for rows.Next() {
			var ts int64
			var d, t string
			rows.Scan(&ts, &d, &t)
			out = append(out, struct {
				Timestamp int64  `json:"timestamp"`
				Domain    string `json:"domain"`
				Type      string `json:"type"`
			}{ts, d, t})
		}
		json.NewEncoder(w).Encode(out)
	})

	// Serve API endpoints only - frontend runs on separate server

	corsAndLoggedMux := corsMiddleware(loggingMiddleware(mux))
	log.Println("Starting HTTP server on :8080")
	log.Fatal(http.ListenAndServe(":8080", corsAndLoggedMux))
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
