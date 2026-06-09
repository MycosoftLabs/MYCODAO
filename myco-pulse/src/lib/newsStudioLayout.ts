/** Shared layout tokens for BLOCKS News broadcast (stage + CNBC chrome). */

export const NEWS_MARKETS_RAIL_WIDTH = "clamp(175px, 22%, 280px)";



/** CNBC bottom bumper row + crawl ticker — keep talent above this stack. */

export const NEWS_BUMPER_ROW_HEIGHT = "68px";

/** Top title bar — slim on phone, full bumper height on desktop. */
export const NEWS_TITLE_BAR_ROW_HEIGHT_MOBILE = "36px";
export const NEWS_TITLE_BAR_ROW_HEIGHT_DESKTOP = NEWS_BUMPER_ROW_HEIGHT;

export const NEWS_TICKER_HEIGHT = "26px";

export const NEWS_BUMPER_TOTAL_HEIGHT = "calc(68px + 26px)";



/**

 * Talent sits in the main column (above the bumper row). Small lift from column bottom

 * = just above the news bar — not floating on the video mid-frame.

 */

export const NEWS_TALENT_BOTTOM_OFFSET = "10px";



/**

 * Desktop: tiny underlap so Markets Now paints over the edge — not a deep crop.

 * Mobile: full width (no right inset).

 */

export const NEWS_STAGE_RAIL_OVERLAP = "clamp(6px, 1vw, 12px)";

export const NEWS_STAGE_INSET_RIGHT = `calc(${NEWS_MARKETS_RAIL_WIDTH} - ${NEWS_STAGE_RAIL_OVERLAP})`;



/**

 * Stage fills the full broadcast column; opaque bumper + crawl cover the bottom stack.

 * Avoids a black gap when the player letterboxes inside a shortened stage slot.

 */

export const NEWS_STAGE_INSET_BOTTOM = "0px";



/** Matches PulseNavItem horizontal padding (`px-4`). */

export const NEWS_NAV_CONTENT_INSET_X = "1rem";



/**

 * Symmetric inset from video-frame top / gap above volume mic — centers glass reel

 * with equal margin above panel top and below panel bottom (just above volume).

 */

export const NEWS_VIDEO_FRAME_EDGE_GAP = "1.25rem";



/** Live Stream Acquisition — clearly inside frame, below top edge (not flush). */

/** Below title bar band inside the video overlay column. */
export const NEWS_VIDEO_ACQUISITION_TOP = `calc(5.5rem + ${NEWS_TITLE_BAR_ROW_HEIGHT_DESKTOP})`;

export const NEWS_VIDEO_ACQUISITION_LEFT = NEWS_NAV_CONTENT_INSET_X;



/** Mic pill (size-7) + offset from column bottom (volume overlay uses bumper stack on desktop). */

export const NEWS_VIDEO_VOLUME_BOTTOM = "0.5rem";

export const NEWS_VIDEO_VOLUME_SIZE = "1.75rem";

/** Bottom band for reel centering: volume stack + symmetric frame gap above mic. */

export const NEWS_VIDEO_FRAME_BOTTOM_RESERVE = `calc(${NEWS_VIDEO_VOLUME_BOTTOM} + ${NEWS_VIDEO_VOLUME_SIZE} + ${NEWS_VIDEO_FRAME_EDGE_GAP})`;



/** Floating glass rail — right edge; vertically centered in video band on desktop. */

export const NEWS_FLOATING_RAIL_RIGHT = "1.75rem";

export const NEWS_FLOATING_RAIL_WIDTH = "min(300px, 38%)";

export const NEWS_FLOATING_RAIL_MAX_HEIGHT = "min(46vh, 480px)";



/** Phone stacked layout: docked glass reel between talent strip and bottom bumper. */

export const NEWS_MOBILE_VIDEO_ASPECT = "16 / 9" as const;

export const NEWS_MOBILE_DOCK_ACTIVE_BLOCK_PX = 156;

/** Visible rule between glass reel and white bumper row on phone (px height). */

export const NEWS_MOBILE_BUMPER_SEPARATOR_HEIGHT = "3px";

/** Collapsed tuck tab width on the right edge (Markets Now mobile). */

export const NEWS_MOBILE_MARKETS_TAB_WIDTH = "2rem";

