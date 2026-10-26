import { Claim } from "./Claim";
import { Desk } from "./Desk";
import { Home } from "./Home";

export function App() {
  const path = location.pathname;
  const claim = path.match(/^\/c\/([A-Za-z0-9_-]{22})$/);
  return (
    <>
      <div className="desk" aria-hidden />
      {claim ? <Claim token={claim[1]} /> : path === "/desk" ? <Desk /> : <Home />}
    </>
  );
}
