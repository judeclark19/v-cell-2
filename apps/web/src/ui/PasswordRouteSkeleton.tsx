import {
  SkeletonBlock,
  SkeletonButtonBlock,
  SkeletonInputField,
  SkeletonTextLine,
  SkeletonTextLines
} from "@/ui/RouteLoading.shared";
import { Panel } from "@vcell/ui";

export function PasswordRouteSkeleton({
  fields,
  label,
  titleWidth
}: {
  fields: Array<{
    labelWidth: number | string;
    marginBottom?: number;
  }>;
  label: string;
  titleWidth: number | string;
}) {
  return (
    <Panel
      padding="lg"
      aria-label={label}
      style={{
        maxWidth: 480,
        marginTop: "2rem",
        marginLeft: "auto",
        marginRight: "auto"
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ marginBottom: 8 }}>
          <SkeletonTextLine $height={38} $width={titleWidth} />
        </h1>
        <SkeletonTextLines widths={["88%", "64%"]} />
      </header>

      <form style={{ maxWidth: 520 }}>
        {fields.map((field, index) => (
          <SkeletonInputField
            key={`password-field-${index}`}
            labelWidth={field.labelWidth}
            marginBottom={field.marginBottom}
          />
        ))}

        <SkeletonButtonBlock $width={180} />

        <div style={{ marginTop: 12 }}>
          <SkeletonBlock $height={14} $width={96} $radius="999px" />
        </div>
      </form>
    </Panel>
  );
}
