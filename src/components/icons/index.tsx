/**
 * Ikonisarjan julkinen rajapinta (SPEC §7). Sarja on jaettu kolmeen
 * tiedostoon, jotta yksittäinen tiedosto pysyy luettavana; kaikki
 * uudelleenviedään täältä, joten tuonti käy aina `@/components/icons`.
 */
export { Svg, type IconProps } from './Svg'
export * from './uiIcons'
export * from './dayIcons'
export * from './equipmentIcons'
