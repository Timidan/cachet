import { Claim } from "./Claim";
import { Dashboard } from "./Dashboard";
import { Home } from "./Home";

export function App() {
  const path = location.pathname;
  const claim = path.match(/^\/c\/([^/]*)$/);
  return claim ? <Claim token={claim[1]} /> : path === "/dashboard" ? <Dashboard /> : <Home />;
}
