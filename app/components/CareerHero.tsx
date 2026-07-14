export function CareerHero() {
  return (
    <section className="hero heroBottom">
      <div>
        <p className="eyebrow">YOUR CAREER COMMAND CENTER</p>
        <h1>
          Make your next move
          <br />
          <em>the right one.</em>
        </h1>
        <p className="heroCopy">
          Keep every opportunity organized, follow up with confidence, and turn applications into offers.
        </p>
      </div>
      <figure className="careerVisual">
        {/* eslint-disable-next-line @next/next/no-img-element -- Static generated asset is served directly by the current Vinext/Sites image pipeline. */}
        <img
          src="/career-command-center.png"
          alt="Professional working at a desk with plants and an upward growth chart"
        />
        <figcaption className="srOnly">Career growth and focused job-search progress</figcaption>
      </figure>
    </section>
  );
}
