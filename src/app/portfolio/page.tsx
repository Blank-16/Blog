import Link from "next/link";
import {
  personal,
  projects,
  coreSkills,
  skillGroups,
  certificates,
  achievements,
} from "./data";

export const metadata = {
  title: "Ansuman Pal — Portfolio",
};

function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-14 border-t border-[#222]">
      <div className="mb-10">
        <span className="text-[11px] tracking-[0.3em] uppercase text-[#555]">
          {"// "}
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-2 py-0.5 border border-[#2a2a2a] text-[#555] rounded-sm tracking-wide">
      {children}
    </span>
  );
}

export default function PortfolioPage() {
  const featuredProjects = projects.filter((p) => p.featured);
  const otherProjects = projects.filter((p) => !p.featured);

  return (
    <main
      className="min-h-screen bg-[#0a0a0a] text-[#ccc]"
      style={{ fontFamily: "var(--font-mono), 'JetBrains Mono', monospace" }}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#181818]">
        <div className="max-w-3xl mx-auto px-5 h-12 flex items-center justify-between gap-4">
          <span className="text-[13px] text-[#444] flex-shrink-0">
            <span className="text-[#e8e8e8]">ansuman</span>
            <span className="text-[#555]">.dev</span>
          </span>
          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-5">
            {["about", "projects", "skills", "contact"].map((s) => (
              <a
                key={s}
                href={`#${s}`}
                className="text-[12px] text-[#555] hover:text-[#ccc] transition-colors duration-150"
              >
                {s}
              </a>
            ))}
            {personal.resumeUrl && (
              <a
                href={personal.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#ccc] border border-[#2a2a2a] px-3 py-1 hover:border-[#555] transition-all duration-150"
              >
                resume ↗
              </a>
            )}
          </div>
          {/* Mobile — resume only */}
          {personal.resumeUrl && (
            <a
              href={personal.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden text-[12px] text-[#ccc] border border-[#2a2a2a] px-3 py-1"
            >
              resume ↗
            </a>
          )}
        </div>
        {/* Mobile sub-nav */}
        <div className="sm:hidden border-t border-[#181818] px-5 h-9 flex items-center gap-5 overflow-x-auto scrollbar-none">
          {["about", "projects", "skills", "contact"].map((s) => (
            <a
              key={s}
              href={`#${s}`}
              className="text-[11px] text-[#555] hover:text-[#ccc] transition-colors flex-shrink-0"
            >
              {s}
            </a>
          ))}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 sm:px-6">
        {/* Hero */}
        <section id="about" className="pt-12 sm:pt-20 pb-14 sm:pb-20">
          <div className="mb-3 text-[11px] tracking-[0.3em] uppercase text-[#444] flex items-center gap-2">
            available for hire
            {personal.availability && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
          </div>

          <h1 className="text-[clamp(1.9rem,8vw,3rem)] font-normal text-[#e8e8e8] leading-[1.1] tracking-[-0.02em] mb-3">
            {personal.name}
          </h1>

          <p className="text-[14px] text-[#888] mb-2">{personal.role}</p>
          <p className="text-[12px] text-[#555] mb-8 max-w-lg leading-relaxed">
            {personal.tagline}
          </p>

          <p className="text-[12px] sm:text-[13px] leading-[1.9] text-[#666] max-w-2xl mb-10">
            {personal.bio}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            {personal.social.github && (
              <a
                href={personal.social.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#555] hover:text-[#ccc] transition-colors border-b border-transparent hover:border-[#555] pb-0.5 w-fit"
              >
                github ↗
              </a>
            )}
            {personal.social.linkedin && (
              <a
                href={personal.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#555] hover:text-[#ccc] transition-colors border-b border-transparent hover:border-[#555] pb-0.5 w-fit"
              >
                linkedin ↗
              </a>
            )}
            <a
              href={`mailto:${personal.email}`}
              className="text-[12px] text-[#555] hover:text-[#ccc] transition-colors border-b border-transparent hover:border-[#555] pb-0.5 w-fit break-all"
            >
              {personal.email}
            </a>
          </div>
        </section>

        {/* Projects */}
        <Section id="projects" label="projects">
          <div className="space-y-12 mb-16">
            {featuredProjects.map((project, i) => (
              <article key={project.id} className="group">
                {/* Header — index + title + year */}
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-[11px] text-[#333] flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[14px] sm:text-[15px] text-[#d8d8d8] font-normal leading-snug group-hover:text-white transition-colors duration-150 flex-1 min-w-0">
                    {project.title}
                  </h3>
                  <span className="text-[11px] text-[#333] flex-shrink-0">
                    {project.year}
                  </span>
                </div>

                {/* Description — no left indent on mobile */}
                <p className="text-[12px] text-[#666] leading-[1.8] mb-3 sm:pl-7">
                  {project.description}
                </p>

                {project.solution && (
                  <p className="text-[11px] text-[#4a4a4a] leading-[1.8] mb-4 sm:pl-7 pl-3 border-l border-[#1d1d1d]">
                    {project.solution}
                  </p>
                )}

                <div className="sm:pl-7 flex items-center gap-3 flex-wrap">
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {project.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#444] hover:text-[#ccc] transition-colors flex-shrink-0"
                    >
                      repo ↗
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#444] hover:text-[#ccc] transition-colors flex-shrink-0"
                    >
                      live ↗
                    </a>
                  )}
                </div>

                {i < featuredProjects.length - 1 && (
                  <div className="mt-10 border-t border-[#181818]" />
                )}
              </article>
            ))}
          </div>

          {otherProjects.length > 0 && (
            <div>
              <p className="text-[11px] tracking-[0.25em] uppercase text-[#333] mb-6">
                other
              </p>
              <div className="space-y-6">
                {otherProjects.map((project) => (
                  <article
                    key={project.id}
                    className="flex items-start justify-between gap-4 group"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] text-[#999] font-normal mb-1 group-hover:text-[#ccc] transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-[11px] text-[#4a4a4a] leading-relaxed mb-2">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {project.tags.map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                      <span className="text-[11px] text-[#333]">
                        {project.year}
                      </span>
                      {project.repoUrl && (
                        <a
                          href={project.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#444] hover:text-[#ccc] transition-colors"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Skills */}
        <Section id="skills" label="skills">
          <div className="space-y-6 mb-14">
            {coreSkills.map((skill, i) => (
              <div key={skill.name} className="flex gap-3 sm:gap-4 group">
                <span className="text-[11px] text-[#2a2a2a] pt-0.5 flex-shrink-0 w-5 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#d8d8d8] mb-1 group-hover:text-white transition-colors duration-150">
                    {skill.name}
                  </p>
                  <p className="text-[11px] text-[#4a4a4a] leading-[1.75]">
                    {skill.proof}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-5 pt-8 border-t border-[#181818]">
            {skillGroups.map((group) => {
              const styles = {
                primary: {
                  label: "primary — daily use",
                  pill: "border-[#444] text-[#999]",
                  labelColor: "text-[#555]",
                },
                secondary: {
                  label: "secondary — shipped, not daily",
                  pill: "border-[#252525] text-[#444]",
                  labelColor: "text-[#3a3a3a]",
                },
                familiar: {
                  label: "familiar — pick up fast",
                  pill: "border-[#1d1d1d] text-[#2e2e2e]",
                  labelColor: "text-[#2a2a2a]",
                },
              }[group.context];
              return (
                <div key={group.context}>
                  <p
                    className={`text-[10px] tracking-[0.25em] uppercase mb-3 ${styles.labelColor}`}
                  >
                    {styles.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className={`text-[11px] px-2.5 py-1 border rounded-sm ${styles.pill}`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Achievements */}
        <Section id="achievements" label="achievements">
          <div className="space-y-5">
            {achievements.map((a) => (
              <div key={a.id} className="flex gap-3">
                <span className="text-[#333] mt-0.5 flex-shrink-0 text-[11px]">
                  →
                </span>
                <div>
                  <p className="text-[13px] text-[#c8c8c8] mb-0.5">{a.title}</p>
                  <p className="text-[12px] text-[#555] leading-relaxed">
                    {a.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Certificates */}
        <Section id="certificates" label="certificates">
          <div className="space-y-5">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-start justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#999] group-hover:text-[#ccc] transition-colors">
                    {cert.title}
                  </p>
                  <p className="text-[11px] text-[#444] mt-0.5">
                    {cert.issuer} &middot; {cert.date}
                  </p>
                </div>
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#333] hover:text-[#ccc] transition-colors flex-shrink-0 pt-0.5"
                  >
                    view ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <Section id="contact" label="contact">
          <div className="space-y-4">
            {[
              { key: "email", val: personal.email, href: `mailto:${personal.email}` },
              { key: "phone", val: personal.phone },
              { key: "location", val: personal.location },
              personal.social.github
                ? { key: "github", val: personal.social.github.replace("https://", ""), href: personal.social.github }
                : null,
              personal.social.linkedin
                ? { key: "linkedin", val: personal.social.linkedin.replace("https://", ""), href: personal.social.linkedin }
                : null,
            ]
              .filter(Boolean)
              .map((row) => (
                <div key={row!.key} className="flex flex-col sm:flex-row sm:gap-4 gap-0.5">
                  <span className="text-[11px] text-[#333] sm:w-20 flex-shrink-0 uppercase tracking-widest">
                    {row!.key}
                  </span>
                  {row!.href ? (
                    <a
                      href={row!.href}
                      target={row!.href.startsWith("mailto") ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      className="text-[12px] text-[#888] hover:text-[#ccc] transition-colors break-all"
                    >
                      {row!.val}
                      {!row!.href.startsWith("mailto") && " ↗"}
                    </a>
                  ) : (
                    <span className="text-[12px] text-[#555] break-words">{row!.val}</span>
                  )}
                </div>
              ))}
          </div>
        </Section>

        {/* Footer */}
        <footer className="py-10 border-t border-[#181818] flex items-center justify-between">
          <span className="text-[11px] text-[#333]">
            {personal.name} &middot; {new Date().getFullYear()}
          </span>
          <Link
            href="/"
            className="text-[11px] text-[#333] hover:text-[#555] transition-colors"
          >
            ← blog
          </Link>
        </footer>
      </div>
    </main>
  );
}
