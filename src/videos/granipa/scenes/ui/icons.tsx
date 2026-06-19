import { ICON_PATHS, type IconName } from "./icon-paths";

export type { IconName };

/**
 * Vendored Lucide stroke icon — the ONLY icon system allowed in this video
 * (quality.md stage B: emojis are banned). One stroke width everywhere.
 */
export const Icon: React.FC<{
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({
  name,
  size = 32,
  color = "currentColor",
  strokeWidth = 1.8,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
  />
);

const GITHUB_MARK_PATH =
  "M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943";

/** Official GitHub mark (Primer Octicons, MIT). Fill-based, not stroke. */
export const GithubMark: React.FC<{
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ size = 32, color = "currentColor", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <path d={GITHUB_MARK_PATH} fill={color} />
  </svg>
);
