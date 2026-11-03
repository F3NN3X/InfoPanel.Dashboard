//! Test helper: a loopback port that is guaranteed to refuse connections.

/// A loopback port that refuses connections, and the socket that keeps it so. It is bound but never listens: a port
/// bound and dropped can be handed to another test's listener (tests run in parallel) before the connection lands.
pub(crate) fn refusing_port() -> (u16, socket2::Socket) {
    let socket = socket2::Socket::new(socket2::Domain::IPV4, socket2::Type::STREAM, None).unwrap();
    socket.bind(&std::net::SocketAddr::from(([127, 0, 0, 1], 0)).into()).unwrap();
    let port = socket.local_addr().unwrap().as_socket().unwrap().port();
    (port, socket)
}
