/* Native anchors are intentional: the existing shared search and access gate initialize on full page loads. */
/* eslint-disable @next/next/no-html-link-for-pages */
import Image from "next/image";
import styles from "./HomePage.module.css";

const cx = (names: string) =>
  names
    .split(" ")
    .map((name) => styles[name])
    .join(" ");

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      className={cx("arrow-icon")}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      width={21}
      height={21}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function Search() {
  return (
    <form
      className={cx("search") + " js-search-form"}
      action="/search"
      method="get"
      role="search"
    >
      <SearchIcon />
      <label className={cx("sr-only")} htmlFor="homepage-evidence-search">
        Search Microbiome Medicine
      </label>
      <input
        className="js-search-input"
        id="homepage-evidence-search"
        name="q"
        type="search"
        placeholder="Search a condition, microbe, or intervention"
        autoComplete="off"
        required
      />
      <button type="submit" aria-label="Search the library">
        <Arrow />
      </button>
      <div
        className={cx("search-results") + " js-search-result"}
        aria-live="polite"
        style={{ display: "none" }}
      />
    </form>
  );
}
const library = [
  {
    title: "Endometriosis",
    category: "Conditions",
    href: "/conditions/endometriosis",
  },
  {
    title: "Irritable bowel syndrome",
    category: "Conditions",
    href: "/conditions/irritable-bowel-syndrome-ibs",
  },
  {
    title: "Bacterial vaginosis",
    category: "Conditions",
    href: "/conditions/bacterial-vaginosis",
  },
  {
    title: "Low-nickel diet",
    category: "Interventions",
    href: "/interventions/low-nickel-diet",
  },
  {
    title: "Metronidazole",
    category: "Interventions",
    href: "/interventions/metronidazole",
  },
  {
    title: "Lactoferrin",
    category: "Interventions",
    href: "/interventions/lactoferrin",
  },
  {
    title: "Microbiome signatures",
    category: "Concepts",
    href: "/definition/microbiome-signatures-definition",
  },
  {
    title: "Metal homeostasis",
    category: "Concepts",
    href: "/definition/metal-homeostasis",
  },
  {
    title: "Estrobolome",
    category: "Concepts",
    href: "/definition/estrobolome",
  },
];

const collections = [
  {
    name: "Conditions",
    number: "01",
    description:
      "Begin with the condition. Explore the microbial patterns reported alongside it.",
    path: "/conditions",
  },
  {
    name: "Interventions",
    number: "02",
    description:
      "Follow a potential target. Examine the research behind each intervention.",
    path: "/interventions",
  },
  {
    name: "Concepts",
    number: "03",
    description:
      "Understand the biology. Put mechanisms, methods, and terminology in context.",
    path: "/definition",
  },
];

// Native links preserve the shared layout scripts, which initialize on page load.
export function HomePage() {
  return (
    <main className={styles.home} id="main-content">
      <section className={cx("hero")} id="top">
        <div className={cx("container hero-grid")}>
          <div className={cx("hero-copy")}>
            <p className={cx("eyebrow light")}>A CONNECTED RESEARCH LIBRARY</p>
            <h1>
              A clearer view of
              <br />{" "}
              the <em>microbiome.</em>
            </h1>
            <p className={cx("hero-intro")}>
              Explore the connections between conditions, microbial signatures,
              and intervention evidence. Follow the science, with its context
              intact.
            </p>
            <Search />
            <div className={cx("quick-searches")}>
              <span>Start with</span>
              <a href="/conditions/endometriosis">Endometriosis</a>
              <a href={"/conditions/irritable-bowel-syndrome-ibs"}>IBS</a>
              <a href={"/interventions/low-nickel-diet"}>Low-nickel diet</a>
            </div>
          </div>
          <article className={cx("spotlight")}>
            <div className={cx("spotlight-heading")}>
              <span className={cx("eyebrow")}>CONDITION IN FOCUS</span>
              <span className={cx("status-label")}>
                <span />
                Research overview
              </span>
            </div>
            <div className={cx("spotlight-main")}>
              <div>
                <span className={cx("small-label")}>WOMEN’S HEALTH</span>
                <h2>
                  <a href="/conditions/endometriosis">Endometriosis</a>
                </h2>
                <p>
                  One condition.
                  <br />{" "}A connected body of evidence.
                </p>
              </div>
              <Image
                src="/wp-content/uploads/2024/01/Endometriosis-microbiome-signature.svg"
                width={1466}
                height={1278}
                alt="Anatomical illustration of the uterus and ovaries from the endometriosis reference page"
              />
            </div>
            <div className={cx("spotlight-links")}>
              <a href="/conditions/endometriosis#rgbc-database">
                <span>
                  <small>01</small>Microbiome signature
                </span>
                <Arrow />
              </a>
              <a href="/conditions/endometriosis#h-interventions">
                <span>
                  <small>02</small>Intervention evidence
                </span>
                <Arrow />
              </a>
              <a href="/conditions/endometriosis#h-references">
                <span>
                  <small>03</small>Studies & sources
                </span>
                <Arrow />
              </a>
            </div>
            <a
              className={cx("spotlight-footer")}
              href="/conditions/endometriosis"
            >
              Explore the condition <Arrow diagonal />
            </a>
          </article>
        </div>
        <div className={cx("container hero-path")}>
          <span>FOLLOW THE CONNECTIONS</span>
          <div>
            Condition <Arrow /> Microbial signature <Arrow /> Intervention
            evidence
          </div>
          <a href="#method">
            Our approach <Arrow diagonal />
          </a>
        </div>
      </section>

      <section className={cx("section container")} id="explore">
        <div className={cx("section-head")}>
          <div>
            <p className={cx("eyebrow")}>EXPLORE THE LIBRARY</p>
            <h2>Find your starting point.</h2>
          </div>
          <p className={cx("section-deck")}>
            A clinical question, a biological pattern,
            <br />{" "}
            or an intervention worth investigating.
          </p>
        </div>
        <div className={cx("collection-grid")}>
          {collections.map((c) => (
            <article className={cx("collection")} key={c.name}>
              <div className={cx("collection-top")}>
                <span>{c.number}</span>
                <Arrow diagonal />
              </div>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <ul>
                {library
                  .filter((item) => item.category === c.name)
                  .map((item) => (
                    <li key={item.title}>
                      <a href={item.href}>
                        {item.title}
                        <Arrow />
                      </a>
                    </li>
                  ))}
              </ul>
              <a className={cx("text-link")} href={c.path}>
                View all {c.name.toLowerCase()} <Arrow />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className={cx("method-section")} id="method">
        <div className={cx("container method-grid")}>
          <div className={cx("method-image")}>
            <Image
              src="/wp-content/uploads/2026/09/microbiome-evidence-researcher.webp"
              sizes="(max-width: 900px) 100vw, 45vw"
              alt="Illustration of a researcher examining a map of microbial evidence"
              width={1448}
              height={1086}
              loading="lazy"
            />
            <span>FROM BIOLOGICAL PATTERN TO RESEARCH QUESTION</span>
          </div>
          <div className={cx("method-copy")}>
            <p className={cx("eyebrow")}>THE EVIDENCE BEHIND THE CONNECTION</p>
            <h2>
              Every finding needs
              <br />{" "}
              its context.
            </h2>
            <p>
              Microbial associations help us ask better questions. Understanding
              an intervention means examining the mechanism, the study design,
              and the outcomes together.
            </p>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h3>Identify the pattern</h3>
                  <p>
                    Explore which microbes have been associated with a condition
                    and where they were sampled.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Examine the mechanism</h3>
                  <p>
                    Investigate how microbial activity could relate to the
                    condition’s biology.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Read the intervention evidence</h3>
                  <p>
                    Distinguish laboratory findings, animal studies, and human
                    outcomes before drawing conclusions.
                  </p>
                </div>
              </li>
            </ol>
            <a className={cx("text-link")} href={"/our-validation-method"}>
              Read our validation method <Arrow />
            </a>
          </div>
        </div>
      </section>

      <section className={cx("section container")} id="research">
        <div className={cx("section-head")}>
          <div>
            <p className={cx("eyebrow")}>RESEARCH IN CONTEXT</p>
            <h2>Read beyond the headline.</h2>
          </div>
          <a
            className={cx("text-link")}
            href="/conditions/endometriosis#rgbc-research-feed"
          >
            Explore endometriosis research <Arrow />
          </a>
        </div>
        <div className={cx("research-list")}>
          <a
            href="/research-feeds/4-hydroxyindole-endometriosis-diagnosis-therapy"
            className={cx("research-row")}
          >
            <span className={cx("research-year")}>2024</span>
            <div>
              <span className={cx("evidence-tag")}>
                Human samples + animal experiments
              </span>
              <h3>
                Stool metabolites and the search for an endometriosis signature
              </h3>
              <p>
                What an exploratory study can tell us, and what still needs
                validation.
              </p>
            </div>
            <Arrow diagonal />
          </a>
          <a
            href="/research-feeds/irritable-bowel-syndrome-like-disorders-in-endometriosis-prevalence-of-nickel-sensitivity-and-effects-of-a-low-nickel-diet-an-open-label-pilot-study"
            className={cx("research-row")}
          >
            <span className={cx("research-year")}>2020</span>
            <div>
              <span className={cx("evidence-tag")}>Open-label human pilot</span>
              <h3>
                Low-nickel diet in endometriosis with gastrointestinal symptoms
              </h3>
              <p>
                Reading the findings alongside the limits of a small,
                uncontrolled study.
              </p>
            </div>
            <Arrow diagonal />
          </a>
          <a
            href="/research-feeds/antibiotic-therapy-with-metronidazole-reduces-endometriosis-disease-progression-in-mice-a-potential-role-for-gut-microbiota-2"
            className={cx("research-row")}
          >
            <span className={cx("research-year")}>2019</span>
            <div>
              <span className={cx("evidence-tag")}>Animal study</span>
              <h3>Metronidazole and lesion progression in mice</h3>
              <p>A preclinical research signal to investigate further.</p>
            </div>
            <Arrow diagonal />
          </a>
        </div>
      </section>

      <section className={cx("membership")} id="membership">
        <div className={cx("container membership-inner")}>
          <div>
            <p className={cx("eyebrow light")}>
              A SHARED PURSUIT OF UNDERSTANDING
            </p>
            <h2>
              Help move the
              <br />{" "}
              conversation forward.
            </h2>
          </div>
          <div>
            <p>
              For clinicians, researchers, and readers who want to stay
              connected to microbiome research and the people working to make
              sense of it.
            </p>
            <a
              className={cx("button light-button")}
              href={"/dashboard/subscription"}
            >
              Explore membership <Arrow diagonal />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
