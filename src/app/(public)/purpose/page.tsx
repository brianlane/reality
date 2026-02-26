import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Purpose | Reality Matchmaking",
  description:
    "Discover why Reality Matchmaking exists — reintroducing real-world dating dynamics to create meaningful connections through curated, in-person events.",
};

export default function PurposePage() {
  return (
    <article className="overflow-x-hidden bg-slate-50">
      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-copper">
            Our Purpose
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-navy sm:text-5xl">
            Dating Apps Broke the Market.
            <br />
            <span className="text-copper">Reality Fixes It.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-soft">
            We&rsquo;re building a matchmaking service grounded in a simple
            truth: real connections happen in real spaces, with real stakes.
          </p>
        </div>
      </section>

      {/* The Problem */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl font-semibold text-navy">
          The Paradox of Choice
        </h2>
        <p className="mt-4 text-base leading-relaxed text-navy-soft">
          Dating apps are dying. And it&apos;s not from a lack of users, but
          from a fundamental design flaw. They create an{" "}
          <strong className="text-navy">illusion of infinite choice</strong>{" "}
          that paralyzes decision making and prevents real connections.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-navy">
              Infinite Options
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-navy">
              Hidden Competition
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-navy">
              Removed Feedback
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-navy">
              Low Conversion Rates
            </h3>
          </div>
        </div>
      </section>

      {/* The Breakthrough */}
      <section className="bg-navy">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold text-white">
            Then You Walk Into the Real World
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-copper-light">
            And the illusion breaks. You&rsquo;re not alone in the market. What
            you can see has changed. Choice has friction. You feel the cost of
            waiting. You notice who pairs off. You sense when you&rsquo;re
            passed by. Dating apps hide the market but{" "}
            <strong className="text-white">
              real life puts it back in front of you.
            </strong>
          </p>
        </div>
      </section>

      {/* The Solution */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl font-semibold text-navy">
          Reality as the Key Feature
        </h2>
        <p className="mt-4 text-base leading-relaxed text-navy-soft">
          Reality Matchmaking reintroduces the physics of real-world dating into
          a curated, intentional experience. We simulate the dynamics of a
          physical venue with visible competition, tangible scarcity, and
          immediate feedback through orchestrated events designed to produce
          meaningful connections.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-copper/10 text-lg font-bold text-copper">
              1
            </div>
            <div>
              <h3 className="text-lg font-semibold text-navy">
                Visible Competition
              </h3>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-copper/10 text-lg font-bold text-copper">
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold text-navy">Real Scarcity</h3>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-copper/10 text-lg font-bold text-copper">
              3
            </div>
            <div>
              <h3 className="text-lg font-semibold text-navy">
                Immediate Feedback
              </h3>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-copper/10 text-lg font-bold text-copper">
              4
            </div>
            <div>
              <h3 className="text-lg font-semibold text-navy">
                Personality First
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-3xl font-semibold text-navy">How It Works</h2>
          <p className="mt-4 text-base leading-relaxed text-navy-soft">
            This is not a networking mixer. It is not a singles happy hour.
            Every event is{" "}
            <strong className="text-navy">intentionally orchestrated</strong> to
            maximize compatibility and meaningful connection.
          </p>

          <div className="mt-10 space-y-10">
            {/* Apply & Vet */}
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
                  I
                </span>
                <h3 className="text-xl font-semibold text-navy">
                  Apply &amp; Vet
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-navy-soft">
                All members complete a comprehensive application and a rigorous
                background screening: identity verification, SSN trace, 7-year
                criminal search, liens, judgments, and bankruptcies. This helps
                confirm honesty and lifestyle stability.
              </p>
            </div>

            {/* Curate & Match */}
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
                  II
                </span>
                <h3 className="text-xl font-semibold text-navy">
                  Curate &amp; Match
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-navy-soft">
                Accepted applicants are scored for compatibility. When 20
                compatible members are identified, event invitations are sent.
                Our curation draws on research from assortative mating and ideal
                partner standards.
              </p>
            </div>

            {/* The Event */}
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
                  III
                </span>
                <h3 className="text-xl font-semibold text-navy">
                  The Reality Dating Experience
                </h3>
              </div>
              <div className="mt-3 space-y-4 text-sm leading-relaxed text-navy-soft">
                <p>
                  Each event spans approximately 3.5 hours and unfolds in three
                  carefully designed phases:
                </p>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-navy">
                    Phase 1 — Blind Speed Dating{" "}
                    <span className="font-normal text-navy-muted">
                      (60 min)
                    </span>
                  </p>
                  <p className="mt-1">
                    Physical partitions prevent visual contact. Participants
                    have 5-minute voice-only conversations with each potential
                    match, focusing entirely on personality, humor,
                    communication style, and values.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-navy">
                    Phase 2 — Face-to-Face Speed Dating{" "}
                    <span className="font-normal text-navy-muted">
                      (60 min)
                    </span>
                  </p>
                  <p className="mt-1">
                    Partitions come down. The same rotations happen again but
                    now face-to-face. Participants can validate or revise their
                    blind impressions, testing whether personality connection
                    translates to physical chemistry.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-navy">
                    Phase 3 — Match Reveal &amp; Social Hour{" "}
                    <span className="font-normal text-navy-muted">
                      (90 min)
                    </span>
                  </p>
                  <p className="mt-1">
                    Curated match recommendations are delivered privately. The
                    space opens for free mingling with deeper conversations and
                    the opportunity to participate in team building activities.
                  </p>
                </div>
              </div>
            </div>

            {/* Post-Event */}
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white">
                  IV
                </span>
                <h3 className="text-xl font-semibold text-navy">
                  After the Event
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-navy-soft">
                The next day, attendees receive feedback and mutual-interest
                notifications. Follow-up surveys at 30 days, 90 days, and 6
                months track outcomes. This data-driven approach continuously
                refines our matching methodology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Trust */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-3xl font-semibold text-navy">Safety &amp; Trust</h2>
        <p className="mt-4 text-base leading-relaxed text-navy-soft">
          Every participant is verified and vetted before they enter a room. Our
          screening process is comprehensive because trust is the foundation of
          meaningful connection.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-center text-navy">
              Identity Verification
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-center text-navy">
              Criminal &amp; Financial Screening
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-center text-navy">
              Continuous Monitoring
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-navy-soft">
          Financial screening is not about wealth, it&rsquo;s about honesty.
          Research shows that financial issues are a leading predictor of
          relationship dissolution, and that financial transparency strengthens
          relationships. By verifying financial standing upfront, we help ensure
          that participants are building connections on a foundation of
          truthfulness.
        </p>
      </section>

      {/* The Science */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-3xl font-semibold text-navy">
            Grounded in Science
          </h2>
          <p className="mt-4 text-base leading-relaxed text-navy-soft">
            Our approach is informed by decades of peer-reviewed research in
            psychology, interpersonal attraction, and relationship science. From
            Gottman&rsquo;s work on interaction patterns that predict marital
            stability to large-scale machine-learning analyses identifying the
            most robust predictors of relationship quality, our methodology
            draws on the best available evidence.
          </p>
          <p className="mt-4 text-base leading-relaxed text-navy-soft">
            We know that personality traits carry remarkable predictive power
            for important life outcomes, that love styles and attachment
            patterns shape relationship dynamics, and that
            relationship-contingent self-esteem can influence how people show up
            in partnerships. We incorporate these insights into every layer of
            our process from the questions we ask to the matches we curate.
          </p>
        </div>
      </section>

      {/* The Vision */}
      <section className="bg-navy">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold text-white">The Vision</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-copper-light">
            Reality Matchmaking exists to disrupt the dating app industry by
            addressing its core pain points: disillusionment from mismatched
            expectations and abysmal conversion rates to real dates. We are
            redefining dating by making{" "}
            <strong className="text-white">reality</strong> the key feature,
            leading to more meaningful connections, higher retention, and
            relationships built to last.
          </p>
          <div className="mt-8">
            <Link
              href="/apply"
              className="inline-block rounded-md bg-copper px-8 py-3 text-base font-medium text-navy transition-colors hover:bg-copper-light"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </section>

      {/* Works Cited */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-navy">
          Supporting Research
        </h2>
        <div className="mt-6 text-sm text-navy-soft">
          <p className="works-cited">
            Aron, A., Norman, C. C., Aron, E. N., McKenna, C., &amp; Heyman, R.
            E. (2000). Couples&rsquo; shared participation in novel and arousing
            activities and experienced relationship quality.{" "}
            <em>Journal of Personality and Social Psychology</em>, 78(2),
            273&ndash;284.
          </p>
          <p className="works-cited">
            Back, M. D., Schmukle, S. C., &amp; Egloff, B. (2011). A closer look
            at first sight: Social relations lens model analysis of personality
            and interpersonal attraction at zero acquaintance.{" "}
            <em>European Journal of Personality</em>, 25(3), 225&ndash;238.
          </p>
          <p className="works-cited">
            Department of Health and Human Services (HHS).{" "}
            <em>45 CFR 46 (The Common Rule)</em>.
          </p>
          <p className="works-cited">
            Dew, J., Britt, S., &amp; Huston, S. (2012). Examining the
            relationship between financial issues and divorce.{" "}
            <em>Family Relations</em>, 61(4), 615&ndash;628.
          </p>
          <p className="works-cited">
            Donnellan, M. B., Conger, R. D., &amp; Bryant, C. M. (2004). The Big
            Five and enduring marriages.{" "}
            <em>Journal of Research in Personality</em>, 38(5), 481&ndash;504.
          </p>
          <p className="works-cited">
            Finkel, E. J., &amp; Eastwick, P. W. (2008). Speed-dating.{" "}
            <em>Current Directions in Psychological Science</em>, 17(3),
            193&ndash;197.
          </p>
          <p className="works-cited">
            Finkel, E. J., Eastwick, P. W., Karney, B. R., Reis, H. T., &amp;
            Sprecher, S. (2012). Online dating: A critical analysis from the
            perspective of psychological science.{" "}
            <em>Psychological Science in the Public Interest</em>, 13(1),
            3&ndash;66.
          </p>
          <p className="works-cited">
            Fletcher, G. J. O., Simpson, J. A., Thomas, G., &amp; Giles, L.
            (1999). Ideals in intimate relationships.{" "}
            <em>Journal of Personality and Social Psychology</em>, 76(1),
            72&ndash;89.
          </p>
          <p className="works-cited">
            Gladstone, J. J., Garbinsky, E. N., &amp; Mogilner, C. (2022).
            Pooling finances and relationship satisfaction.{" "}
            <em>Journal of Personality and Social Psychology</em>.
          </p>
          <p className="works-cited">
            Gonzaga, G. C., Carter, S., &amp; Buckwalter, J. G. (2010).
            Assortative mating, convergence, and satisfaction in married
            couples. <em>Personal Relationships</em>, 17(4), 634&ndash;644.
          </p>
          <p className="works-cited">
            Gottman, J. M., Coan, J., Carrere, S., &amp; Swanson, C. (1998).
            Predicting marital happiness and stability from newlywed
            interactions. <em>Journal of Marriage and the Family</em>, 60(1),
            5&ndash;22.
          </p>
          <p className="works-cited">
            Gottman, J. M., &amp; Gottman, J. S. (2015).{" "}
            <em>The Seven Principles for Making Marriage Work</em>.
          </p>
          <p className="works-cited">
            Hazan, C., &amp; Shaver, P. (1987). Romantic love conceptualized as
            an attachment process.{" "}
            <em>Journal of Personality and Social Psychology</em>, 52(3),
            511&ndash;524.
          </p>
          <p className="works-cited">
            Heller, D., Watson, D., &amp; Ilies, R. (2004). The role of person
            versus situation in life satisfaction: A critical examination.{" "}
            <em>Psychological Bulletin</em>, 130(4), 574&ndash;600.
          </p>
          <p className="works-cited">
            Hendrick, C., &amp; Hendrick, S. (1986). A theory and method of
            love. <em>Journal of Personality and Social Psychology</em>, 50(2),
            392&ndash;402.
          </p>
          <p className="works-cited">
            Hitsch, G. J., Hortaçsu, A., &amp; Ariely, D. (2010). Matching and
            sorting in online dating. <em>American Economic Review</em>, 100(1),
            130&ndash;163.
          </p>
          <p className="works-cited">
            Joel, S., Eastwick, P. W., &amp; Finkel, E. J. (2017). Is romantic
            desire predictable? Machine learning applied to initial romantic
            attraction. <em>Psychological Science</em>, 28(10), 1478&ndash;1489.
          </p>
          <p className="works-cited">
            Joel, S., Eastwick, P. W., Allison, C. J., et al. (2020). Machine
            learning uncovers the most robust self-report predictors of
            relationship quality across 43 longitudinal couples studies.{" "}
            <em>Proceedings of the National Academy of Sciences</em>, 117(32),
            19061&ndash;19071.
          </p>
          <p className="works-cited">
            Knee, C. R., Canevello, A., Bush, A. L., &amp; Cook, A. (2008).
            Relationship-contingent self-esteem and the ups and downs of
            romantic relationships.{" "}
            <em>Journal of Personality and Social Psychology</em>, 95(3),
            608&ndash;627.
          </p>
          <p className="works-cited">
            Klohnen, E. C., &amp; Luo, S. (2003). Interpersonal attraction and
            personality: What is attractive — self similarity, ideal similarity,
            complementarity, or attachment security?{" "}
            <em>Journal of Personality and Social Psychology</em>, 85(4),
            709&ndash;722.
          </p>
          <p className="works-cited">
            Lenton, A. P., &amp; Francesconi, M. (2011). Too much of a good
            thing? Variety is confusing in mate choice. <em>Biology Letters</em>
            {", 7(4), 528\u2013531."}
          </p>
          <p className="works-cited">
            Malouff, J. M., Thorsteinsson, E. B., Schutte, N. S., Bhullar, N.,
            &amp; Rooke, S. E. (2010). The Five-Factor Model of personality and
            relationship satisfaction of intimate partners: A meta-analysis.{" "}
            <em>Journal of Research in Personality</em>, 44(1), 124&ndash;127.
          </p>
          <p className="works-cited">
            Montoya, R. M., Horton, R. S., &amp; Kirchner, J. (2008). Is actual
            similarity necessary for attraction? A meta-analysis of actual and
            perceived similarity.{" "}
            <em>Journal of Social and Personal Relationships</em>, 25(6),
            889&ndash;922.
          </p>
          <p className="works-cited">
            Navarra, R. J., &amp; Gottman, J. M. (2018). Bids and turning toward
            in Gottman Method Couple Therapy.
          </p>
          <p className="works-cited">
            Paulhus, D. L., &amp; Reid, D. B. (1991). Enhancement and denial in
            socially desirable responding.{" "}
            <em>Journal of Personality and Social Psychology</em>, 60(2),
            307&ndash;317.
          </p>
          <p className="works-cited">
            Roberts, B. W., Kuncel, N. R., Shiner, R., Caspi, A., &amp;
            Goldberg, L. R. (2007). The power of personality: The comparative
            validity of personality traits, socioeconomic status, and cognitive
            ability for predicting important life outcomes.{" "}
            <em>Perspectives on Psychological Science</em>, 2(4), 313&ndash;345.
          </p>
          <p className="works-cited">
            Simpson, J. A., Rholes, W. S., &amp; Phillips, D. (1996). Conflict
            in close relationships: An attachment perspective.{" "}
            <em>Journal of Personality and Social Psychology</em>, 71(5),
            899&ndash;914.
          </p>
          <p className="works-cited">
            Social Instincts. (2025). 3 ways your relationship can benefit from
            parallel play.
          </p>
        </div>
      </section>
    </article>
  );
}
