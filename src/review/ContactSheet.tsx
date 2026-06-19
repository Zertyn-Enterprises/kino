/**
 * Tiles pre-rendered thumbnails (from `remotion render --sequence`) into
 * labeled contact-sheet pages for motion review. Each composition frame is
 * one page; scripts/filmstrip.sh renders all pages with --sequence.
 *
 * Pure <Img> grid on purpose: no comp re-mounting, no WebGL contexts.
 */

import type { CalculateMetadataFunction } from "remotion";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";

const COLS = 6;
const ROWS = 5;
const TILE_W = 480;
const TILE_H = 270;
const LABEL_H = 26;
const PER_PAGE = COLS * ROWS;

export type ContactSheetProps = {
  /** Folder inside public/ that holds the thumbnails. */
  folder: string;
  /** Source frame number of each thumbnail, in order. */
  frames: number[];
  /** Thumbnail file names, in the same order as `frames`. */
  files: string[];
};

export const calculateContactSheetMetadata: CalculateMetadataFunction<
  ContactSheetProps
> = ({ props }) => ({
  durationInFrames: Math.max(1, Math.ceil(props.frames.length / PER_PAGE)),
  fps: 1,
  width: COLS * TILE_W,
  height: ROWS * (TILE_H + LABEL_H),
});

export const ContactSheet: React.FC<ContactSheetProps> = ({
  folder,
  frames,
  files,
}) => {
  const page = useCurrentFrame();
  const start = page * PER_PAGE;
  const slice = frames.slice(start, start + PER_PAGE);
  return (
    <AbsoluteFill
      style={{
        background: "#101010",
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, ${TILE_W}px)`,
        gridAutoRows: TILE_H + LABEL_H,
        alignContent: "start",
      }}
    >
      {slice.map((frame, i) => (
        <div key={frame} style={{ width: TILE_W, height: TILE_H + LABEL_H }}>
          <Img
            src={staticFile(`${folder}/${files[start + i]}`)}
            style={{ width: TILE_W, height: TILE_H, display: "block" }}
          />
          <div
            style={{
              height: LABEL_H,
              fontFamily: "monospace",
              fontSize: 16,
              color: "#7ee7ff",
              background: "#000",
              padding: "3px 8px",
              boxSizing: "border-box",
            }}
          >
            f{frame}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
