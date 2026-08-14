/**
 * Lab App palette (hex → Mantine 10-shade scales; index 6 is the main tone for that color key).
 *
 * Roles:
 * - Page / shell: white (linen kept as a named palette swatch for optional accents)
 * - Body & labels: black (#1F2A2E) via theme.black
 * - Filled inputs / LabSelect: mist (pale blue)
 * - Primary actions / success: leaf (green #388659)
 * - Active nav / selected mode: mauve (#916C80)
 * - Errors: coral (#DA5858)
 */

export const paletteHex = {
  linen: '#F9EAE1',
  mist: '#BCD3F2',
  ink: '#1F2A2E',
  leaf: '#388659',
  mauve: '#916C80',
  coral: '#DA5858',
};

/** Filled NumberInput, TextInput, LabSelect */
export const inputFieldColor = 'mist';

/** Primary “calculate” / confirm actions */
export const primaryActionColor = 'leaf';

/** Active route, Dosage menu open state */
export const navActiveColor = 'mauve';

/** Alerts / validation errors */
export const errorColor = 'coral';

const { linen, mist, ink, leaf, mauve, coral } = paletteHex;

export const labTheme = {
  primaryColor: primaryActionColor,
  black: ink,
  white: '#ffffff',
  colors: {
    linen: [
      linen,
      '#f3e4d8',
      '#ecddcf',
      '#e5d6c6',
      '#decfbd',
      '#d7c8b4',
      '#d0c1ab',
      '#c9baa2',
      '#c2b399',
      '#bbac90',
    ],
    mist: [
      '#f8fbfe',
      '#f1f6fc',
      '#eaf1fa',
      '#e3ecf8',
      '#dce7f6',
      '#d5e2f4',
      mist,
      '#9bb8d9',
      '#7a9dc0',
      '#5a82a7',
    ],
    leaf: [
      '#eef6f1',
      '#ddede3',
      '#cce4d5',
      '#bbdbc7',
      '#aad2b9',
      '#99c9ab',
      leaf,
      '#2d6b47',
      '#225536',
      '#1a4028',
    ],
    mauve: [
      '#f5f0f3',
      '#ebe1e7',
      '#e1d2db',
      '#d7c3cf',
      '#cdb4c3',
      '#c3a5b7',
      mauve,
      '#7a5a6c',
      '#634558',
      '#4c3044',
    ],
    coral: [
      '#fdecec',
      '#fad9d9',
      '#f7c6c6',
      '#f4b3b3',
      '#f1a0a0',
      '#ee8d8d',
      coral,
      '#c44747',
      '#a83838',
      '#8c2929',
    ],
  },
  components: {
    TextInput: { defaultProps: { variant: 'filled', color: inputFieldColor } },
    Textarea: { defaultProps: { variant: 'filled', color: inputFieldColor } },
    NumberInput: { defaultProps: { variant: 'filled', color: inputFieldColor } },
    /** Default button tint (nav and menus override `color` / `variant`). */
    Button: { defaultProps: { color: primaryActionColor } },
    InputWrapper: {
      styles: {
        label: { fontWeight: 500 },
      },
    },
  },
};
