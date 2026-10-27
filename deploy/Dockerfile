# Hosted Cachet: the web app, its worker and the demo's signer, plus a regtest Zcash chain (Zebra + lightwalletd).
# The binaries in bin/ are built on an Arch-family machine; this base image supplies a matching glibc
# (the VPS runs Debian 11, whose glibc is too old to run them directly).
FROM archlinux:base
RUN pacman -Sy --noconfirm --needed gcc-libs xz curl && pacman -Scc --noconfirm
COPY bin/ /usr/local/bin/
WORKDIR /app
COPY app/ ./
ENV DATA_DIR=/data/app DEVTOOL=/usr/local/bin/zcash-devtool HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["/app/deploy/run.sh"]
