package main

import (
	"database/sql"
	"encoding/json"
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
	qtype := strings.Fields(qtypeRaw)[0]
	blocked := 0
	if strings.HasPrefix(qtypeRaw, "UNKNOWN") {
		blocked = 1
	}
	if _, err := db.Exec(`INSERT INTO queries(timestamp, client, domain, type, blocked) VALUES(?,?,?,?,?)`,
		ts.Unix(), client, domain, qtype, blocked); err != nil {
		log.Printf("DB insert error: %v", err)
	} else {
		log.Printf("Logged query: %s %s %s blocked=%d", client, domain, qtype, blocked)
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
		rows, _ := db.Query(`
            SELECT domain, COUNT(*) as cnt
            FROM queries
            WHERE blocked=0 AND timestamp >= strftime('%s','now')-86400
            GROUP BY domain
            ORDER BY cnt DESC
            LIMIT 20`)
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
		rows, _ := db.Query(`
            SELECT type, COUNT(*)
            FROM queries
            WHERE timestamp >= strftime('%s','now')-86400
            GROUP BY type`)
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
		rows, _ := db.Query(`
            SELECT domain, COUNT(*) as cnt
            FROM queries
            WHERE blocked=1 AND timestamp >= strftime('%s','now')-86400
            GROUP BY domain
            ORDER BY cnt DESC
            LIMIT 20`)
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
		rows, _ := db.Query(`
            SELECT client, COUNT(*) as cnt
            FROM queries
            WHERE timestamp >= strftime('%s','now')-86400
            GROUP BY client
            ORDER BY cnt DESC
            LIMIT 20`)
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

		rows, _ := db.Query(`
            SELECT timestamp, domain, type, blocked
            FROM queries
            WHERE client = ? AND timestamp >= strftime('%s','now')-86400
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?`, client, pageSize, offset)
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
