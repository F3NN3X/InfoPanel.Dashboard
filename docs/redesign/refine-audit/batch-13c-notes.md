# Batch 13c: three flaky tests

None of the three failed in about 150 local runs before the change (one Windows machine; the Vitest case also beside
10 parallel full unit suites). The causes below are read from the code, not from a captured failure.

## `refused_when_nothing_listens` (`src-tauri/src/http.rs`)
- Cause: it bound a listener on port 0, read the port, dropped it, then expected a refusal. In the lib test binary other
  tests run in parallel and bind their own port-0 listeners (`control.rs`, `native.rs` start real servers), so the freed
  port can be handed to one of them before the connect: the probe then connects and the assertion fails.
- Fix: the port is held by a socket that is bound but never listens (`socket2`, now a dev-dependency of the app crate;
  already in the lock file via the workspace). Connecting to it is refused, and nobody else can be given it.
- Counts: before 50 runs 0 failures (and 25 runs of the whole lib suite, 0); after 50 runs 0 failures.

## `routes_proxies` (`maps_oversize_cut_and_unreachable_upstreams_to_node_statuses`)
- Cause: the same bind-drop-reuse race. Its six tests run in parallel in one process, each binding an upstream and the
  server on port 0; the "dead" port could be handed to one of them, so the proxy would get an answer instead of a 504.
- Fix: `refusing_port()` holds the port with a bound, non-listening socket for the length of the request.
- Counts: before 40 runs 0 failures; after 50 runs 0 failures.

## `connections.dom.test.tsx`
- Not reproduced: 20 runs alone, 15 runs beside 4 full unit suites, 12 runs beside 10 full unit suites: 0 failures.
- Read through: no real timers or network in play (happy-dom has no `EventSource`, so the Stream Deck client is inert;
  `fetch` is stubbed; the Twitch and YouTube pollers only start when a sign-in is pending, which no case sets). The only
  timing is Testing Library's default 1 s `findBy`/`waitFor`. I found no cause I can point to, so nothing was changed
  and no timeout was lengthened.

## Same pattern elsewhere, fixed the same way
`proxy_tests.rs` (`relays_a_loopback_server_through_the_real_clients`) and `streamdeck/tests.rs`
(`reports_the_app_absent_when_nothing_listens`) dropped a bound listener and then expected a refusal. Both now use one
helper, `crate::test_net::refusing_port()` (`crates/ips-server/src/test_net.rs`, test-only). The integration test
`routes_proxies.rs` is a separate crate and keeps its own copy of the helper. 30 runs each after the change, 0 failures.
A grep of `src-tauri` for bind, read port, drop, then connect found no other case (the remaining drops, in `native.rs`
and `control.rs`, hold the port on purpose to test port-in-use).
