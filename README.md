# MikroTik DNS

This is a simple web server to manage MikroTik DNS records. It provides a web interface and an API to view DNS records.

## How it works

The server is a simple Go web server that does the following:

*   Serves a static web page from the `./page` directory.
*   Provides an API endpoint at `/api/dns` that returns a list of DNS records.
*   The web page makes a request to the `/api/dns` endpoint to get the DNS records and display them in a table.

## Deployment

There are two ways to deploy this project:

### 1. Build the binary

To build the binary, you need to have Go installed. Then you can run the following command:

```bash
make build
```

This will create a binary named `mikrotik-dns` in the `build` directory. You can then run this binary on your server.

### 2. Build the Docker container

To build the Docker container, you need to have Docker installed. Then you can run the following command:

```bash
make docker
```

This will build a Docker image named `mikrotik-dns`. You can then run this container on your server.

## Port

The server listens on port `8080`.

## MikroTik Integration

To integrate this with your MikroTik router, you need to do the following:

1.  Make sure the server is running and accessible from your MikroTik router.
2.  On your MikroTik router, go to **IP > DNS > Static**.
3.  Click the **Add New** button.
4.  In the **Name** field, enter the domain name you want to resolve.
5.  In the **Address** field, enter the IP address of the server where you are running this project.
6.  Click **OK**.

Now, when you try to resolve the domain name you entered, your MikroTik router will forward the request to this server, which will return the list of DNS records.
