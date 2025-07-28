build-backend:
	go build -o mikrotik-dns main.go

run-backend: build-backend
	./mikrotik-dns

run:
	make run-backend
