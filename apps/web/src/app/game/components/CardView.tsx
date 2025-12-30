import "./card.css";

function CardView({ faceDown = false }: { faceDown?: boolean }) {
  return (
    <div className={`card ${faceDown ? "face-down" : ""}`}>
      <div className="card-inner">🂠</div>
    </div>
  );
}
export default CardView;
