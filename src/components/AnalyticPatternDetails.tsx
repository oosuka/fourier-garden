import { useMemo } from "react";
import { renderToString } from "katex";

export interface AnalyticDetailsParameter {
  label: string;
  value: string;
}

export interface AnalyticProfileItem {
  id: string;
  label: string;
  value: number;
  displayValue: string;
}

export interface AnalyticDataTable {
  eyebrow: string;
  title: string;
  description: string;
  columns: readonly Readonly<{ key: string; label: string }>[];
  rows: readonly Readonly<{ id: string; cells: Readonly<Record<string, string>> }>[];
}

export interface AnalyticCausalityRow {
  id: string;
  quantity: string;
  status: "保持" | "圧縮" | "演出";
  visual: string;
  audio: string;
}

interface AnalyticPatternDetailsProps {
  formulaLatex: string;
  identities: readonly string[];
  mathematicalBody: string | readonly string[];
  scopeNotice: string;
  parameters: readonly Readonly<AnalyticDetailsParameter>[];
  profile: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    items: readonly Readonly<AnalyticProfileItem>[];
  }>;
  tables: readonly Readonly<AnalyticDataTable>[];
  causality: readonly Readonly<AnalyticCausalityRow>[];
}

export function AnalyticPatternDetails({
  formulaLatex,
  identities,
  mathematicalBody,
  scopeNotice,
  parameters,
  profile,
  tables,
  causality,
}: AnalyticPatternDetailsProps) {
  const formulas = useMemo(
    () =>
      [formulaLatex, ...identities].map((latex) =>
        renderToString(latex, { throwOnError: false, displayMode: true }),
      ),
    [formulaLatex, identities],
  );
  const paragraphs = typeof mathematicalBody === "string" ? [mathematicalBody] : mathematicalBody;
  const maximumProfileMagnitude = Math.max(
    1e-12,
    ...profile.items.map((item) => Math.abs(item.value)),
  );

  return (
    <>
      <section className="mathSection">
        <span className="layerLabel">EXACT MATHEMATICAL LAYER / 厳密な数学層</span>
        <div className="detailsFormula" dangerouslySetInnerHTML={{ __html: formulas[0]! }} />
        {formulas.slice(1).map((formula, index) => (
          <div
            className="mathIdentity mathIdentity--compact"
            // The identity order is fixed by the chapter definition.
            key={identities[index]}
            dangerouslySetInnerHTML={{ __html: formula }}
          />
        ))}
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p className="scopeNotice">{scopeNotice}</p>
        <dl className="parameterList">
          {parameters.map((parameter) => (
            <div key={parameter.label}>
              <dt>{parameter.label}</dt>
              <dd>{parameter.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="dataSection analyticProfileSection">
        <div className="sectionLabel">
          <span>{profile.eyebrow}</span>
          <span>{profile.title}</span>
        </div>
        <p className="analyticSectionDescription">{profile.description}</p>
        <div className="analyticProfile" aria-label={profile.title}>
          {profile.items.map((item) => (
            <div className="analyticProfileItem" key={item.id}>
              <span>{item.label}</span>
              <i aria-hidden="true">
                <b
                  className={item.value < 0 ? "isNegative" : ""}
                  style={{ width: `${(Math.abs(item.value) / maximumProfileMagnitude) * 100}%` }}
                />
              </i>
              <strong>{item.displayValue}</strong>
            </div>
          ))}
        </div>
      </section>

      {tables.map((table) => (
        <section className="coefficientSection analyticTableSection" key={table.eyebrow}>
          <div className="sectionLabel">
            <span>{table.eyebrow}</span>
            <span>{table.title}</span>
          </div>
          <p className="analyticSectionDescription">{table.description}</p>
          <div className="analyticTableScroll">
            <table>
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.id}>
                    {table.columns.map((column) => (
                      <td key={column.key}>{row.cells[column.key] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="coefficientSection analyticTableSection causalitySection">
        <div className="sectionLabel">
          <span>SOUND–SHAPE CAUSALITY</span>
          <span>数学・映像・音響の因果台帳</span>
        </div>
        <p className="analyticSectionDescription">
          厳密に保持する量、知覚帯域へ圧縮する量、数学層の外側に加える演出を区別します。
        </p>
        <div className="analyticTableScroll">
          <table>
            <thead>
              <tr>
                <th>数学量 / 層</th>
                <th>区分</th>
                <th>局所映像</th>
                <th>音響写像</th>
              </tr>
            </thead>
            <tbody>
              {causality.map((row) => (
                <tr key={row.id}>
                  <td>{row.quantity}</td>
                  <td>
                    <span className={`causalityStatus causalityStatus--${row.status}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.visual}</td>
                  <td>{row.audio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
