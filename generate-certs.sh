#!/bin/bash

echo "Generating self-signed certificates for Instaserve..."

# Create openssl config file
cat > openssl.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = Instaserve
OU = Development
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate with config
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -config openssl.conf -extensions v3_req

# Clean up config
rm openssl.conf

echo "Certificates generated: cert.pem and key.pem"

# Add to system trust store (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Adding certificate to macOS trust store..."
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.pem
    echo "Certificate added to macOS trust store"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Adding certificate to Linux trust store..."
    sudo cp cert.pem /usr/local/share/ca-certificates/instaserve.crt
    sudo update-ca-certificates
    echo "Certificate added to Linux trust store"
else
    echo "Please manually add cert.pem to your system's trust store"
fi

echo "HTTPS certificates ready! Use 'npx instaserve -secure' to enable HTTPS"
echo "Note: You may still see browser warnings for self-signed certificates" 