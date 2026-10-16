/**
 * Transcription of the printed AutoCare diagnostic checklist.
 * Stable item keys are deliberately separate from labels: changing a label
 * later must never change the identity of a previously checked item.
 * Pen markings, prices and handwritten notes in the photograph are excluded.
 */
export const DIAGNOSTIC_SECTIONS = [
  { id: 'checklist', title: 'CHECKLIST', column: 'left', items: [
    ['engine-oil','Engine Oil'], ['oil-filter','Oil Filter'],
    ['air-filter','Air Filter'], ['cabin-filter','Cabin Filter'],
    ['battery','Battery'], ['fuel-filter','Fuel Filter'],
  ]},
  { id: 'engine', title: 'ENGINE SECTION', column: 'left', items: [
    ['engine-oil-cap','Engine Oil Cap'], ['drain-plug','Drain Plug'],
    ['engine-oil-pan-gasket','Engine Oil Pan/Gasket'], ['valve-clearance','Valve Clearance'],
    ['valve-cover-gasket','Valve Cover Gasket'], ['transmission-fluid','Transmission Fluid'],
    ['transmission-oil-pan-gasket','Transmission Oil Pan/Gasket'],
    ['clutch-fluid','Clutch Fluid'], ['differential-oil','Differential Oil'],
  ]},
  { id: 'steering', title: 'STEERING SYSTEM', column: 'left', items: [
    ['power-steering-fluid','Power Steering Fluid'], ['power-steering-pump','Power Steering Pump'],
    ['rack-pinion','Rack and Pinion'], ['steering-boots','Steering Boots L/R'],
    ['rack-end','Rack End'], ['tie-rod','Tie Rod'],
    ['shock-absorber-front','Shock Absorber Front'], ['shock-absorber-rear','Shock Absorber Rear'],
    ['shock-mounting','Shock Mounting'], ['stabilizer-link','Stabilizer Link'],
    ['lower-control-arm','Lower Control Arm'], ['upper-control-arm','Upper Control Arm'],
  ]},
  { id: 'brake', title: 'BRAKE & TIRES', column: 'left', items: [
    ['tires','Tires'], ['lug-nuts','Lug Nuts'], ['brake-pads','Brake Pads'],
    ['brake-shoe','Brake Shoe'], ['brake-fluid','Brake Fluid'],
    ['brake-drum','Brake Drum'], ['rotor-disc','Rotor Disc'], ['caliper','Caliper'],
    ['master-cylinder','Master Cylinder'], ['wheel-cylinder','Wheel Cylinder'],
  ]},
  { id: 'ignition', title: 'IGNITION SYSTEM', column: 'left', items: [
    ['spark-plug','Spark Plug'], ['ignition-coil','Ignition Coil'],
    ['engine-starter','Engine Starter'],
  ]},
  { id: 'cooling', title: 'COOLING SYSTEM', column: 'left', items: [
    ['radiator','Radiator'], ['radiator-fan','Radiator Fan'],
    ['radiator-hose','Radiator Hose'], ['coolant','Coolant'], ['reservoir','Reservoir'],
  ]},
  { id: 'belts', title: 'BELTS', column: 'right', items: [
    ['timing-belt','Timing Belt'], ['compressor-belt','Compressor Belt'],
    ['alternator-belt','Alternator Belt'], ['steering-pump-belt','Steering Pump Belt'],
    ['serpentine-belt','Serpentine Belt'],
  ]},
  { id: 'oil-seal', title: 'OIL SEAL', column: 'right', items: [
    ['camshaft-oil-seal','Camshaft Oil Seal'], ['crankshaft-oil-seal','Crankshaft Oil Seal'],
    ['transmission-oil-seal','Transmission Oil Seal'],
  ]},
  { id: 'drive-train', title: 'DRIVE TRAIN', column: 'right', items: [
    ['cv-joint','CV Joint'], ['cv-boots','CV Boots'], ['axle','Axle'],
  ]},
  { id: 'air-intake-exhaust', title: 'AIR INTAKE & EXHAUST', column: 'right', items: [
    ['throttle-body','Throttle Body'], ['intake-manifold','Intake Manifold'],
    ['maf-sensor','MAF Sensor'], ['oxygen-sensor','Oxygen Sensor'],
    ['turbo','Turbo'], ['exhaust-gas-recirculation','Exhaust Gas Recirculation'],
  ]},
  { id: 'lights-horn', title: 'LIGHTS & HORN', column: 'right', items: [
    ['headlight','Headlight L/R'], ['signal-light','F/R Signal Light L/R'],
    ['park-light','Park Light L/R'], ['fog-light','Fog Light L/R'],
  ]},
] as const;

export type DiagnosticStatus = 'GOOD' | 'WARNING' | 'REPLACE';
export type DiagnosticItemKey = (typeof DIAGNOSTIC_SECTIONS)[number]['items'][number][0];
export const DIAGNOSTIC_KEYS = new Set<string>(DIAGNOSTIC_SECTIONS.flatMap(section => section.items.map(item => item[0])));
export const DIAGNOSTIC_CATEGORIES = DIAGNOSTIC_SECTIONS.map(section => ({
  id: section.id,
  title: section.title,
  items: section.items.map(([key, label]) => ({ key, label })),
}));
export const DIAGNOSTIC_ITEMS = DIAGNOSTIC_SECTIONS.flatMap(section => section.items.map(([key, label]) => ({
  key, label, sectionId: section.id, sectionTitle: section.title,
})));
export function diagnosticLabel(key: string): string {
  return DIAGNOSTIC_ITEMS.find(item => item.key === key)?.label ?? key;
}
export function isDiagnosticStatus(value: unknown): value is DiagnosticStatus {
  return value === 'GOOD' || value === 'WARNING' || value === 'REPLACE';
}
