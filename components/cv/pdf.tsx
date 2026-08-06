import type { ReactElement, ReactNode } from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { CVData, CVLine } from "@/lib/types";

/**
 * The exported chart: one clean single-column A4 template of EARNED lines
 * only. Helvetica family, generous margins, quiet hairline section rules,
 * a single brass accent, and the footer line "Charted with Polaris".
 * Built here (JSX cannot live in route.ts); the export route calls
 * `renderToBuffer(createCvDocument(cv, extras))`.
 */

const INK = "#161A22";
const MUTED = "#5A6170";
const RULE = "#D9DCE3";
const BRASS = "#8A6B2F";

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 72,
    paddingHorizontal: 62,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.45,
    color: INK,
  },
  name: {
    fontSize: 21,
    letterSpacing: 0.4,
  },
  headline: {
    fontSize: 10.5,
    color: MUTED,
    marginTop: 3,
  },
  contact: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 7,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 8.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: BRASS,
  },
  sectionRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    marginTop: 3,
    marginBottom: 9,
  },
  entry: {
    marginBottom: 9,
  },
  entryHead: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  entryMeta: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 1,
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 2.5,
  },
  bulletMark: {
    width: 11,
    color: MUTED,
  },
  bulletText: {
    flex: 1,
  },
  bodyText: {
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 62,
    right: 62,
    textAlign: "center",
    fontSize: 7.5,
    letterSpacing: 1.1,
    color: MUTED,
  },
});

function dateSpan(start?: string, end?: string, current?: boolean): string {
  const from = start?.trim() ?? "";
  const to = current ? "now" : (end?.trim() ?? "");
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletMark}>–</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export function CvDocument({
  cv,
  extraLines = [],
}: {
  cv: CVData;
  /** Earned roadmap lines not already present in the CV itself. */
  extraLines?: CVLine[];
}) {
  const basics = cv.basics ?? { name: "", links: [] };
  const contact = [
    basics.email,
    basics.phone,
    basics.location,
    ...(basics.links ?? []),
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  const extras = (section: CVLine["section"]) =>
    extraLines.filter((line) => line.section === section);

  const experience = (cv.experience ?? []).filter(
    (role) => role.role?.trim() || role.company?.trim(),
  );
  const projects = (cv.projects ?? []).filter((p) => p.name?.trim());
  const skills = (cv.skills ?? []).map((s) => s.trim()).filter(Boolean);
  const education = (cv.education ?? []).filter((e) =>
    e.institution?.trim(),
  );

  const hasExperience = experience.length > 0 || extras("experience").length > 0;
  const hasProjects = projects.length > 0 || extras("projects").length > 0;
  const hasSkills = skills.length > 0 || extras("skills").length > 0;
  const hasEducation = education.length > 0 || extras("education").length > 0;

  const skillLine = [
    ...skills,
    ...extras("skills").map((line) => line.text),
  ].join("  ·  ");

  return (
    <Document
      title={basics.name ? `${basics.name} — CV` : "CV"}
      author={basics.name || "Polaris"}
      creator="Polaris"
      producer="Polaris"
    >
      <Page size="A4" style={styles.page} wrap>
        {basics.name?.trim() ? (
          <Text style={styles.name}>{basics.name}</Text>
        ) : null}
        {basics.headline?.trim() ? (
          <Text style={styles.headline}>{basics.headline}</Text>
        ) : null}
        {contact.length > 0 ? (
          <Text style={styles.contact}>{contact.join("   ·   ")}</Text>
        ) : null}

        {hasExperience ? (
          <Section title="Experience">
            {experience.map((role, index) => {
              const head = [role.role?.trim(), role.company?.trim()]
                .filter(Boolean)
                .join(" — ");
              const dates = dateSpan(role.start, role.end, role.current);
              return (
                <View key={index} style={styles.entry} wrap={false}>
                  <Text style={styles.entryHead}>{head}</Text>
                  {dates ? <Text style={styles.entryMeta}>{dates}</Text> : null}
                  {(role.bullets ?? [])
                    .map((b) => b.trim())
                    .filter(Boolean)
                    .map((bullet, bulletIndex) => (
                      <Bullet key={bulletIndex} text={bullet} />
                    ))}
                </View>
              );
            })}
            {extras("experience").map((line, index) => (
              <Bullet key={`extra-${index}`} text={line.text} />
            ))}
          </Section>
        ) : null}

        {hasProjects ? (
          <Section title="Projects">
            {projects.map((project, index) => {
              const tech = (project.tech ?? [])
                .map((t) => t.trim())
                .filter(Boolean);
              return (
                <View key={index} style={styles.entry} wrap={false}>
                  <Text style={styles.entryHead}>{project.name}</Text>
                  {project.description?.trim() ? (
                    <Text style={styles.bodyText}>{project.description}</Text>
                  ) : null}
                  {tech.length > 0 || project.link?.trim() ? (
                    <Text style={styles.entryMeta}>
                      {[tech.join(", "), project.link?.trim()]
                        .filter(Boolean)
                        .join("   ·   ")}
                    </Text>
                  ) : null}
                </View>
              );
            })}
            {extras("projects").map((line, index) => (
              <Bullet key={`extra-${index}`} text={line.text} />
            ))}
          </Section>
        ) : null}

        {hasSkills ? (
          <Section title="Skills">
            <Text style={styles.bodyText}>{skillLine}</Text>
          </Section>
        ) : null}

        {hasEducation ? (
          <Section title="Education">
            {education.map((school, index) => {
              const qualification = [school.degree?.trim(), school.field?.trim()]
                .filter(Boolean)
                .join(", ");
              const dates = dateSpan(school.start, school.end);
              return (
                <View key={index} style={styles.entry} wrap={false}>
                  <Text style={styles.entryHead}>{school.institution}</Text>
                  {qualification || dates ? (
                    <Text style={styles.entryMeta}>
                      {[qualification, dates].filter(Boolean).join("   ·   ")}
                    </Text>
                  ) : null}
                </View>
              );
            })}
            {extras("education").map((line, index) => (
              <Bullet key={`extra-${index}`} text={line.text} />
            ))}
          </Section>
        ) : null}

        <Text style={styles.footer} fixed>
          Charted with Polaris
        </Text>
      </Page>
    </Document>
  );
}

/** JSX-free entry point for the route handler. */
export function createCvDocument(
  cv: CVData,
  extraLines: CVLine[] = [],
): ReactElement<DocumentProps> {
  return (
    <CvDocument cv={cv} extraLines={extraLines} />
  ) as ReactElement<DocumentProps>;
}
