import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-container">
      <h1>LostOrFound</h1>

      <Link to="/create-report" className="cta-button">
        Opprett ny rapport
      </Link>
    </div>
  );
}