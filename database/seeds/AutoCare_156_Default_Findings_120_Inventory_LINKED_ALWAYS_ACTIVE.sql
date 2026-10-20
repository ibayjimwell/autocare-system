-- AutoCare System | Common Workshop Findings + Inventory + Checklist Links
-- PostgreSQL / Supabase SQL Editor | NON-DESTRUCTIVE, IDEMPOTENT SEED
-- Prepared 2026-10-20. PHP prices and quantities are illustrative, NOT verified inventory.
-- Coverage: 66/66 existing Diagnostic Checklist component keys, 156 Default Findings,
--           120 generic inventory SKUs, 183 Default Finding parts and 156 links.
-- SAFETY: newly generated inventory is ALWAYS ACTIVE per AutoCare requirements; sample stock must be physically verified before operational use.
-- NO updates/deletes to existing inventory, default_findings, default_finding_parts, or appointments.
-- Stocks, prices and fitments MUST be verified by Auto Pro Tech before using these records.
-- Parts may have fitment-specific dimensions and should NOT automatically be ordered.
-- PMS parts labeled is_pms=true have price_at_time=0, to avoid double-charging
-- the oil/filter when included in the booked PMS package. Validate inclusion in each real package.
-- Do not execute alongside another copy of this same script concurrently.
-- No DDL changes to permanent business tables, only temporary staging tables.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('autocare_default_findings_inventory_seed_2026_10_20'));

CREATE TEMP TABLE _acdf_inventory_seed (
  sku text PRIMARY KEY, name text NOT NULL, unit text NOT NULL,
  cost_price numeric(10,2) NOT NULL, selling_price numeric(10,2) NOT NULL,
  sample_quantity integer NOT NULL, reorder_level integer NOT NULL
) ON COMMIT DROP;
INSERT INTO _acdf_inventory_seed (sku, name, unit, cost_price, selling_price, sample_quantity, reorder_level) VALUES
  ('OIL-REG-1L', 'Mineral engine oil SAE 15W-40 (1 L; verify grade)', 'liter', 220, 340, 18, 8),
  ('OIL-SEMI-1L', 'Semi-synthetic engine oil 10W-40 (1 L; verify grade)', 'liter', 340, 490, 4, 6),
  ('OIL-FULL-1L', 'Fully synthetic engine oil 5W-30 (1 L; verify grade)', 'liter', 460, 650, 25, 8),
  ('OIL-DIESEL-1L', 'Diesel engine oil 15W-40 (1 L; verify grade)', 'liter', 290, 430, 25, 8),
  ('OIL-FILTER', 'Engine oil filter (vehicle-specific; verify fitment)', 'piece', 180, 330, 18, 7),
  ('OIL-DRAIN-WASHER', 'Engine drain plug sealing washer (fitment required)', 'piece', 18, 45, 35, 12),
  ('OIL-DRAIN-PLUG', 'Engine oil drain plug (fitment required)', 'piece', 110, 220, 0, 3),
  ('OIL-PAN-GASKET', 'Engine oil pan gasket (vehicle-specific)', 'piece', 350, 700, 0, 2),
  ('OIL-FILL-CAP', 'Engine oil filler cap (vehicle-specific)', 'piece', 160, 350, 13, 2),
  ('AIR-FILTER', 'Engine air filter element (vehicle-specific)', 'piece', 210, 400, 3, 5),
  ('AIR-INTAKE-HOSE', 'Air intake rubber hose (vehicle-specific)', 'piece', 550, 950, 2, 2),
  ('CABIN-FILTER', 'Cabin/pollen air filter element (vehicle-specific)', 'piece', 220, 450, 6, 5),
  ('CABIN-BLOWER-FILTER', 'Air-conditioning filter cartridge (vehicle-specific)', 'piece', 240, 470, 9, 2),
  ('BATTERY-NS40', '12V automotive battery NS40/35Ah (verify size)', 'piece', 2700, 3700, 2, 2),
  ('BATTERY-55D23', '12V automotive battery 55D23/60Ah (verify size)', 'piece', 3800, 5200, 1, 2),
  ('BATTERY-TERMINAL', 'Battery terminal clamp (size-specific)', 'piece', 90, 200, 2, 4),
  ('BATTERY-GREASE', 'Battery terminal protectant (small can)', 'can', 160, 300, 2, 2),
  ('FUEL-FILTER-GAS', 'Gasoline fuel filter (vehicle-specific)', 'piece', 280, 560, 7, 2),
  ('FUEL-FILTER-DIESEL', 'Diesel fuel filter/water separator (vehicle-specific)', 'piece', 550, 1050, 18, 3),
  ('FUEL-FILTER-O-RING', 'Fuel filter housing O-ring kit', 'set', 110, 250, 10, 3),
  ('VALVE-COVER-GASKET', 'Valve cover gasket (vehicle-specific)', 'piece', 380, 780, 0, 2),
  ('VALVE-COVER-GROMMET', 'Valve cover bolt seal/grommet kit', 'set', 190, 390, 48, 2),
  ('VALVE-CLEARANCE-SHIM', 'Valve adjustment shim (verify dimension)', 'piece', 130, 290, 10, 2),
  ('TRANSMISSION-FLUID-ATF', 'Automatic transmission fluid ATF (1 L; verify spec)', 'liter', 320, 500, 9, 6),
  ('TRANSMISSION-FLUID-MTF', 'Manual transmission gear oil (1 L; verify spec)', 'liter', 270, 450, 2, 5),
  ('TRANSMISSION-PAN-GASKET', 'Automatic transmission pan gasket (vehicle-specific)', 'piece', 420, 850, 18, 2),
  ('TRANSMISSION-FILTER', 'Automatic transmission strainer/filter (vehicle-specific)', 'piece', 650, 1250, 16, 2),
  ('CLUTCH-FLUID', 'DOT 4 brake/clutch fluid (500 mL; verify spec)', 'bottle', 180, 360, 4, 6),
  ('CLUTCH-MASTER-KIT', 'Clutch master cylinder repair kit (vehicle-specific)', 'set', 520, 1100, 9, 2),
  ('CLUTCH-SLAVE-CYL', 'Clutch slave cylinder (vehicle-specific)', 'piece', 950, 1850, 7, 2),
  ('DIFF-GEAR-OIL', 'Differential gear oil 80W-90 (1 L; verify spec)', 'liter', 290, 480, 8, 5),
  ('DIFF-COVER-GASKET', 'Differential cover gasket/seal (fitment required)', 'piece', 330, 650, 2, 2),
  ('PS-FLUID', 'Hydraulic power steering fluid (1 L; verify spec)', 'liter', 280, 470, 4, 5),
  ('PS-PUMP', 'Hydraulic power steering pump (vehicle-specific)', 'piece', 3800, 6900, 0, 1),
  ('PS-HOSE', 'Power steering high-pressure hose (vehicle-specific)', 'piece', 1100, 2200, 11, 2),
  ('STEERING-RACK', 'Steering rack and pinion assembly (vehicle-specific)', 'piece', 5500, 9500, 5, 1),
  ('STEERING-RACK-BOOT', 'Steering rack dust boot (vehicle-specific)', 'piece', 190, 420, 3, 3),
  ('STEERING-RACK-END', 'Steering rack end/inner tie rod (vehicle-specific)', 'piece', 430, 850, 5, 3),
  ('TIE-ROD-END', 'Outer tie rod end (vehicle-specific)', 'piece', 460, 920, 3, 3),
  ('SHOCK-FRONT', 'Front shock absorber/strut (vehicle-specific)', 'piece', 1250, 2450, 2, 3),
  ('SHOCK-REAR', 'Rear shock absorber (vehicle-specific)', 'piece', 950, 1900, 2, 3),
  ('SHOCK-MOUNT', 'Shock absorber mounting (vehicle-specific)', 'piece', 500, 1050, 0, 3),
  ('STABILIZER-LINK', 'Stabilizer link (vehicle-specific)', 'piece', 320, 780, 11, 4),
  ('CONTROL-ARM-LOWER', 'Lower suspension control arm (vehicle-specific)', 'piece', 1650, 3250, 1, 2),
  ('CONTROL-ARM-UPPER', 'Upper suspension control arm (vehicle-specific)', 'piece', 1450, 2850, 5, 2),
  ('CONTROL-ARM-BUSH', 'Control arm bushing (vehicle-specific)', 'piece', 250, 620, 11, 3),
  ('BALL-JOINT', 'Suspension ball joint (vehicle-specific)', 'piece', 490, 980, 5, 3),
  ('TIRE-185-65R15', 'Passenger tire 185/65 R15 (confirm vehicle size)', 'piece', 2200, 3300, 4, 2),
  ('TIRE-265-65R17', 'SUV tire 265/65 R17 (confirm vehicle size)', 'piece', 4800, 6500, 3, 2),
  ('TIRE-VALVE', 'Tire valve stem/TR413 (verify type)', 'piece', 25, 80, 8, 12),
  ('TIRE-PATCH', 'Tubeless tire patch/plug repair kit (per tire)', 'set', 95, 220, 16, 6),
  ('LUG-NUT', 'Wheel lug nut (vehicle-specific thread)', 'piece', 70, 150, 16, 8),
  ('WHEEL-STUD', 'Wheel stud (vehicle-specific thread)', 'piece', 115, 260, 48, 5),
  ('BRAKE-PADS-FRONT', 'Front disc brake pad set (vehicle-specific)', 'set', 670, 1450, 11, 3),
  ('BRAKE-PADS-REAR', 'Rear disc brake pad set (vehicle-specific)', 'set', 590, 1250, 13, 3),
  ('BRAKE-SHOE-SET', 'Rear drum brake shoe set (vehicle-specific)', 'set', 550, 1250, 13, 2),
  ('BRAKE-FLUID-DOT4', 'DOT 4 brake fluid (500 mL; verify spec)', 'bottle', 180, 350, 5, 6),
  ('BRAKE-DRUM', 'Brake drum (vehicle-specific)', 'piece', 950, 1900, 1, 2),
  ('BRAKE-ROTOR', 'Brake rotor/disc (vehicle-specific)', 'piece', 1050, 2150, 4, 2),
  ('BRAKE-CALIPER-KIT', 'Brake caliper piston/seal kit (vehicle-specific)', 'set', 440, 950, 21, 2),
  ('BRAKE-CALIPER', 'Brake caliper assembly (vehicle-specific)', 'piece', 2350, 4500, 0, 1),
  ('BRAKE-MASTER-CYL', 'Brake master cylinder (vehicle-specific)', 'piece', 1400, 2900, 2, 1),
  ('BRAKE-WHEEL-CYL', 'Drum brake wheel cylinder (vehicle-specific)', 'piece', 500, 1100, 4, 2),
  ('BRAKE-HOSE', 'Flexible brake hose (vehicle-specific)', 'piece', 380, 820, 4, 3),
  ('SPARK-PLUG-NICKEL', 'Standard nickel spark plug (vehicle-specific heat range)', 'piece', 110, 270, 12, 8),
  ('SPARK-PLUG-IRIDIUM', 'Iridium spark plug (vehicle-specific heat range)', 'piece', 380, 700, 12, 6),
  ('IGNITION-COIL', 'Ignition coil assembly (vehicle-specific)', 'piece', 1100, 2250, 11, 2),
  ('IGNITION-COIL-BOOT', 'Ignition coil boot/seal kit (vehicle-specific)', 'set', 190, 390, 1, 2),
  ('STARTER-MOTOR', 'Starter motor assembly (vehicle-specific)', 'piece', 2750, 5500, 2, 1),
  ('STARTER-SOLENOID', 'Starter motor solenoid (vehicle-specific)', 'piece', 700, 1550, 7, 2),
  ('RADIATOR', 'Engine radiator assembly (vehicle-specific)', 'piece', 2400, 4700, 5, 1),
  ('RADIATOR-CAP', 'Radiator pressure cap (verify rated pressure)', 'piece', 100, 240, 2, 4),
  ('RADIATOR-FAN', 'Radiator fan motor/assembly (vehicle-specific)', 'piece', 1800, 3500, 0, 1),
  ('FAN-RELAY', 'Cooling fan relay (fitment required)', 'piece', 170, 370, 35, 3),
  ('RADIATOR-HOSE-UPPER', 'Upper radiator hose (vehicle-specific)', 'piece', 310, 670, 6, 3),
  ('RADIATOR-HOSE-LOWER', 'Lower radiator hose (vehicle-specific)', 'piece', 330, 720, 16, 3),
  ('RADIATOR-CLAMP', 'Radiator hose clamp (size-specific)', 'piece', 35, 95, 48, 10),
  ('COOLANT-1L', 'Premixed engine coolant (1 L; correct chemistry required)', 'liter', 200, 380, 5, 8),
  ('COOLANT-CONCENTRATE', 'Coolant concentrate (1 L; verify chemistry)', 'liter', 310, 560, 4, 5),
  ('COOLANT-RESERVOIR', 'Coolant expansion reservoir/tank (vehicle-specific)', 'piece', 520, 1100, 13, 2),
  ('THERMOSTAT', 'Engine coolant thermostat (vehicle-specific)', 'piece', 350, 800, 18, 2),
  ('TIMING-BELT-KIT', 'Timing belt service kit (vehicle-specific)', 'set', 1900, 4100, 0, 1),
  ('TIMING-TENSIONER', 'Timing belt tensioner (vehicle-specific)', 'piece', 840, 1800, 7, 1),
  ('AC-COMPRESSOR-BELT', 'Air-con compressor drive belt (vehicle-specific)', 'piece', 260, 590, 0, 3),
  ('ALTERNATOR-BELT', 'Alternator drive belt (vehicle-specific)', 'piece', 260, 590, 2, 3),
  ('PS-DRIVE-BELT', 'Power steering pump drive belt (vehicle-specific)', 'piece', 270, 620, 11, 3),
  ('SERPENTINE-BELT', 'Serpentine drive belt (vehicle-specific)', 'piece', 420, 940, 18, 3),
  ('BELT-TENSIONER', 'Accessory belt tensioner (vehicle-specific)', 'piece', 900, 1850, 6, 2),
  ('CAMSHAFT-SEAL', 'Camshaft oil seal (vehicle-specific)', 'piece', 190, 440, 22, 3),
  ('CRANKSHAFT-SEAL', 'Crankshaft oil seal (vehicle-specific)', 'piece', 250, 520, 48, 3),
  ('TRANSMISSION-AXLE-SEAL', 'Transmission axle/output oil seal (vehicle-specific)', 'piece', 260, 580, 16, 3),
  ('CV-JOINT', 'Constant velocity (CV) joint (vehicle-specific)', 'piece', 1100, 2350, 3, 2),
  ('CV-BOOT-KIT', 'CV boot + grease + clamps (vehicle-specific)', 'set', 340, 760, 2, 3),
  ('DRIVE-AXLE', 'Drive axle/half shaft assembly (vehicle-specific)', 'piece', 2550, 5400, 2, 1),
  ('AXLE-SEAL', 'Drive axle oil seal (vehicle-specific)', 'piece', 240, 510, 22, 3),
  ('THROTTLE-GASKET', 'Throttle body gasket (vehicle-specific)', 'piece', 140, 360, 5, 3),
  ('THROTTLE-BODY', 'Throttle body assembly (vehicle-specific)', 'piece', 2900, 5800, 4, 1),
  ('THROTTLE-CLEANER', 'Throttle body cleaner aerosol (can)', 'can', 160, 310, 0, 3),
  ('INTAKE-MANIFOLD-GASKET', 'Intake manifold gasket (vehicle-specific)', 'set', 390, 850, 16, 2),
  ('VACUUM-HOSE', 'Engine vacuum hose (1 meter; correct size)', 'meter', 80, 180, 48, 6),
  ('MAF-SENSOR', 'Mass airflow (MAF) sensor (vehicle-specific)', 'piece', 1600, 3400, 7, 2),
  ('MAF-CLEANER', 'MAF sensor cleaner aerosol (can)', 'can', 260, 450, 21, 2),
  ('O2-SENSOR', 'Oxygen/lambda sensor (vehicle-specific)', 'piece', 1600, 3500, 18, 2),
  ('EXHAUST-GASKET', 'Exhaust manifold/flange gasket (vehicle-specific)', 'piece', 270, 620, 1, 3),
  ('TURBO-HOSE', 'Turbo/intercooler boost hose (vehicle-specific)', 'piece', 900, 1950, 11, 2),
  ('TURBO-CHARGER', 'Turbocharger assembly (vehicle-specific)', 'piece', 8500, 16000, 1, 1),
  ('TURBO-GASKET-KIT', 'Turbo oil/exhaust gasket kit (vehicle-specific)', 'set', 600, 1450, 18, 2),
  ('EGR-VALVE', 'Exhaust gas recirculation valve (vehicle-specific)', 'piece', 1800, 4100, 0, 2),
  ('EGR-GASKET', 'EGR valve gasket (vehicle-specific)', 'piece', 180, 430, 16, 3),
  ('EGR-CLEANER', 'Intake/EGR carbon cleaner (can)', 'can', 230, 480, 13, 3),
  ('HEADLAMP-BULB-H4', 'Halogen headlight bulb H4 12V (verify socket)', 'piece', 170, 400, 8, 6),
  ('HEADLAMP-ASSEMBLY', 'Headlamp housing/assembly (vehicle-specific)', 'piece', 2050, 4300, 1, 1),
  ('SIGNAL-BULB-T20', 'Turn signal bulb T20/7440 (verify socket)', 'piece', 70, 180, 28, 8),
  ('SIGNAL-LAMP', 'Turn signal lamp unit (vehicle-specific)', 'piece', 490, 1100, 4, 2),
  ('PARK-BULB-T10', 'Parking/city lamp T10 bulb (verify socket)', 'piece', 40, 120, 16, 8),
  ('PARK-LAMP', 'Parking lamp assembly (vehicle-specific)', 'piece', 390, 870, 4, 2),
  ('FOG-BULB-H11', 'Fog lamp bulb H11 12V (verify socket)', 'piece', 180, 460, 22, 4),
  ('FOG-LAMP', 'Fog lamp assembly (vehicle-specific)', 'piece', 650, 1550, 21, 2),
  ('HORN-RELAY', 'Automotive horn/light relay 12V (verify rating)', 'piece', 150, 350, 2, 3),
  ('WIRE-CONNECTOR', 'Automotive electrical connector repair kit', 'set', 190, 430, 28, 3);

CREATE TEMP TABLE _acdf_finding_seed (title text PRIMARY KEY, item_key text NOT NULL) ON COMMIT DROP;
INSERT INTO _acdf_finding_seed (title, item_key) VALUES
  ('Engine oil dark or degraded; service interval reached', 'engine-oil'),
  ('Engine oil level below specification; inspect consumption and leaks', 'engine-oil'),
  ('Engine oil contaminated or milky; further diagnosis required', 'engine-oil'),
  ('Scheduled engine oil change due - PMS package oil already included', 'engine-oil'),
  ('Scheduled full-synthetic oil replacement due - PMS package inclusion', 'engine-oil'),
  ('Diesel engine oil service due; verify OEM oil specification', 'engine-oil'),
  ('Oil filter overdue for replacement', 'oil-filter'),
  ('Oil filter housing leaking or filter seal damaged', 'oil-filter'),
  ('Oil filter replacement included in PMS package', 'oil-filter'),
  ('Engine air filter clogged with dust', 'air-filter'),
  ('Engine air filter damaged or improperly seated', 'air-filter'),
  ('Air intake pipe cracked near filter housing', 'air-filter'),
  ('Cabin air filter heavily contaminated', 'cabin-filter'),
  ('Cabin filter torn or moisture damaged', 'cabin-filter'),
  ('Additional cabin blower intake filter restricted (if equipped)', 'cabin-filter'),
  ('Battery test shows weak cold-cranking performance', 'battery'),
  ('Battery cannot hold charge; size confirmation needed', 'battery'),
  ('Battery terminals corroded or loose', 'battery'),
  ('Diesel fuel filter contaminated; water/particles detected', 'fuel-filter'),
  ('Gasoline fuel filter restricted; flow test required', 'fuel-filter'),
  ('Fuel filter housing seal leaking', 'fuel-filter'),
  ('Engine oil filler cap seal hardened or leaking', 'engine-oil-cap'),
  ('Oil filler cap missing or damaged', 'engine-oil-cap'),
  ('Drain plug washer leaking; replace seal', 'drain-plug'),
  ('Engine drain plug threads damaged; repair assessment required', 'drain-plug'),
  ('Engine oil pan gasket seeping oil', 'engine-oil-pan-gasket'),
  ('Engine oil pan seal leaking heavily; reseal required', 'engine-oil-pan-gasket'),
  ('Valve clearance out of manufacturer tolerance', 'valve-clearance'),
  ('Top-end ticking noise; valve train measurement required', 'valve-clearance'),
  ('Valve cover gasket leaking engine oil', 'valve-cover-gasket'),
  ('Valve cover bolt grommets hardened; oil seepage', 'valve-cover-gasket'),
  ('Automatic transmission fluid degraded or burnt', 'transmission-fluid'),
  ('Manual transmission gear oil below specification', 'transmission-fluid'),
  ('Transmission fluid leak suspected; trace source before service', 'transmission-fluid'),
  ('Transmission pan gasket leaking ATF', 'transmission-oil-pan-gasket'),
  ('Transmission filter restricted with debris', 'transmission-oil-pan-gasket'),
  ('Clutch hydraulic fluid low or contaminated', 'clutch-fluid'),
  ('Clutch hydraulic pressure loss; slave cylinder leaking', 'clutch-fluid'),
  ('Clutch master cylinder internal leak suspected', 'clutch-fluid'),
  ('Differential oil service due or degraded', 'differential-oil'),
  ('Differential cover seepage; gasket deteriorated', 'differential-oil'),
  ('Hydraulic power steering fluid low; inspect leakage', 'power-steering-fluid'),
  ('Power steering fluid contaminated or foaming', 'power-steering-fluid'),
  ('Power steering pump noisy under steering load', 'power-steering-pump'),
  ('Power steering pump shaft seal leaking', 'power-steering-pump'),
  ('Power steering pressure hose leaking near pump', 'power-steering-pump'),
  ('Steering rack internal leakage detected', 'rack-pinion'),
  ('Excessive rack and pinion play or knocking', 'rack-pinion'),
  ('Steering rack boot torn with grease exposure', 'steering-boots'),
  ('Rack dust boot cracked and not sealing', 'steering-boots'),
  ('Inner tie rod rack end has excessive play', 'rack-end'),
  ('Rack end ball joint dust seal failed', 'rack-end'),
  ('Outer tie rod end loose or knocking', 'tie-rod'),
  ('Tie rod end dust boot split; joint contamination', 'tie-rod'),
  ('Front shock absorber oil leakage observed', 'shock-absorber-front'),
  ('Front strut damping weak or excessive bouncing', 'shock-absorber-front'),
  ('Rear shock absorber leaking oil', 'shock-absorber-rear'),
  ('Rear suspension bounces excessively after rebound', 'shock-absorber-rear'),
  ('Front or rear shock mounting cracked', 'shock-mounting'),
  ('Shock mounting bearing noisy or loose', 'shock-mounting'),
  ('Stabilizer link joint loose with rattling', 'stabilizer-link'),
  ('Stabilizer link boot torn with joint play', 'stabilizer-link'),
  ('Lower control arm bent or cracked', 'lower-control-arm'),
  ('Lower control arm rubber bush deteriorated', 'lower-control-arm'),
  ('Lower suspension ball joint has excessive play', 'lower-control-arm'),
  ('Upper control arm ball joint worn', 'upper-control-arm'),
  ('Upper arm rubber bush cracked', 'upper-control-arm'),
  ('Tires below safe tread depth; confirm correct size', 'tires'),
  ('Tire sidewall bulge or cut; replacement required', 'tires'),
  ('Tire losing pressure from leaking valve', 'tires'),
  ('Repairable tread puncture detected; inspect puncture location', 'tires'),
  ('Wheel lug nuts missing or rounded', 'lug-nuts'),
  ('Wheel stud threads stripped or broken', 'lug-nuts'),
  ('Front brake pads below wear specification', 'brake-pads'),
  ('Rear disc brake pads worn unevenly', 'brake-pads'),
  ('Brake pad contamination from grease or fluid', 'brake-pads'),
  ('Rear drum brake shoes lining worn', 'brake-shoe'),
  ('Rear brake shoe lining contaminated with oil/fluid', 'brake-shoe'),
  ('Brake fluid overdue; moisture/condition concern', 'brake-fluid'),
  ('Brake fluid low; inspect brake hydraulics for leaks', 'brake-fluid'),
  ('Brake drum scoring or excessive internal wear', 'brake-drum'),
  ('Rear brake drum cracked or out of tolerance', 'brake-drum'),
  ('Brake rotor below minimum thickness or heavily scored', 'rotor-disc'),
  ('Brake rotor lateral runout suspected; measurement required', 'rotor-disc'),
  ('Brake caliper piston seized or sticking', 'caliper'),
  ('Caliper housing damaged or bleeding screw seized', 'caliper'),
  ('Brake caliper flexible hose leaking', 'caliper'),
  ('Brake master cylinder internal bypass suspected', 'master-cylinder'),
  ('Brake master cylinder external leak', 'master-cylinder'),
  ('Rear wheel cylinder leaking brake fluid', 'wheel-cylinder'),
  ('Rear wheel cylinder piston seized', 'wheel-cylinder'),
  ('Spark plugs worn electrodes or excessive gap', 'spark-plug'),
  ('Spark plug fouled with carbon/oil; engine diagnosis needed', 'spark-plug'),
  ('Ignition coil misfire under load (test-confirmed)', 'ignition-coil'),
  ('Ignition coil boot carbon tracking or cracked insulation', 'ignition-coil'),
  ('Starter motor cranks slowly despite healthy battery', 'engine-starter'),
  ('Starter solenoid intermittent click/no crank', 'engine-starter'),
  ('Radiator coolant leak at core or tank seam', 'radiator'),
  ('Radiator pressure cap fails pressure test', 'radiator'),
  ('Radiator internal blockage or overheating suspected', 'radiator'),
  ('Radiator cooling fan motor not operating', 'radiator-fan'),
  ('Cooling fan relay failed functional test', 'radiator-fan'),
  ('Upper radiator hose swollen, cracked or seeping', 'radiator-hose'),
  ('Lower radiator hose deteriorated or leaking', 'radiator-hose'),
  ('Radiator hose clamp corroded/loose', 'radiator-hose'),
  ('Engine coolant low or diluted; pressure test recommended', 'coolant'),
  ('Coolant heavily contaminated or service interval exceeded', 'coolant'),
  ('Engine thermostat suspected stuck causing overheating', 'coolant'),
  ('Coolant reservoir cracked or visibly leaking', 'reservoir'),
  ('Coolant expansion tank cap or hose connection damaged', 'reservoir'),
  ('Timing belt cracked or overdue per manufacturer interval', 'timing-belt'),
  ('Timing tensioner noisy or belt tracking abnormal', 'timing-belt'),
  ('Air-con compressor drive belt frayed or glazed', 'compressor-belt'),
  ('A/C belt loose or squealing; inspect alignment', 'compressor-belt'),
  ('Alternator drive belt worn or slipping', 'alternator-belt'),
  ('Alternator belt squeals under electrical load', 'alternator-belt'),
  ('Power steering drive belt cracked', 'steering-pump-belt'),
  ('Power steering pump belt squealing on turns', 'steering-pump-belt'),
  ('Serpentine accessory belt cracked or glazed', 'serpentine-belt'),
  ('Accessory belt tensioner weak or noisy', 'serpentine-belt'),
  ('Camshaft oil seal leaking around timing cover', 'camshaft-oil-seal'),
  ('Camshaft seal hardened; seepage along cylinder head', 'camshaft-oil-seal'),
  ('Front crankshaft seal leaking engine oil', 'crankshaft-oil-seal'),
  ('Rear crankshaft seal suspected; confirm leak source', 'crankshaft-oil-seal'),
  ('Transmission output/axle seal seeping fluid', 'transmission-oil-seal'),
  ('Transmission oil seal damaged near axle housing', 'transmission-oil-seal'),
  ('CV joint clicking on turns; confirm affected side', 'cv-joint'),
  ('CV joint excessive axial/radial play', 'cv-joint'),
  ('CV boot torn with grease loss', 'cv-boots'),
  ('CV boot clamp missing; contamination risk', 'cv-boots'),
  ('Drive axle shaft vibration or runout suspected', 'axle'),
  ('Axle damaged at spline/seal area', 'axle'),
  ('Throttle body carbon accumulation; idle unstable', 'throttle-body'),
  ('Electronic throttle body actuator failed testing', 'throttle-body'),
  ('Intake manifold gasket vacuum leak detected', 'intake-manifold'),
  ('Air intake vacuum hose cracked or detached', 'intake-manifold'),
  ('MAF sensor contaminated; cleaning/diagnosis advised', 'maf-sensor'),
  ('MAF sensor signal out of specification (test-confirmed)', 'maf-sensor'),
  ('Oxygen sensor heater circuit malfunction verified', 'oxygen-sensor'),
  ('Oxygen sensor slow response confirmed by scan data', 'oxygen-sensor'),
  ('Turbocharger boost hose split causing loss of power', 'turbo'),
  ('Turbocharger bearing noise/oil leakage confirmed', 'turbo'),
  ('Turbo oil feed/return gasket seeping', 'turbo'),
  ('EGR valve stuck from carbon deposits', 'exhaust-gas-recirculation'),
  ('EGR valve actuator/position sensor fault confirmed', 'exhaust-gas-recirculation'),
  ('Exhaust/EGR pipe flange gasket leaking', 'exhaust-gas-recirculation'),
  ('Headlight bulb failed illumination test', 'headlight'),
  ('Headlamp housing cracked or water ingress', 'headlight'),
  ('Headlamp lighting relay fault verified', 'headlight'),
  ('Turn signal bulb not operating', 'signal-light'),
  ('Signal lamp housing broken or loose', 'signal-light'),
  ('Turn signal connector corroded or heat damaged', 'signal-light'),
  ('Parking/position lamp bulb not working', 'park-light'),
  ('Parking lamp lens damaged or water ingress', 'park-light'),
  ('Fog lamp bulb failed function test', 'fog-light'),
  ('Fog lamp housing shattered or bracket broken', 'fog-light');

CREATE TEMP TABLE _acdf_part_seed (
  finding_title text NOT NULL, sku text NOT NULL, quantity integer NOT NULL, is_pms boolean NOT NULL,
  PRIMARY KEY (finding_title, sku, is_pms)
) ON COMMIT DROP;
INSERT INTO _acdf_part_seed (finding_title, sku, quantity, is_pms) VALUES
  ('Engine oil dark or degraded; service interval reached', 'OIL-REG-1L', 4, FALSE),
  ('Engine oil level below specification; inspect consumption and leaks', 'OIL-REG-1L', 1, FALSE),
  ('Scheduled engine oil change due - PMS package oil already included', 'OIL-SEMI-1L', 4, TRUE),
  ('Scheduled full-synthetic oil replacement due - PMS package inclusion', 'OIL-FULL-1L', 4, TRUE),
  ('Diesel engine oil service due; verify OEM oil specification', 'OIL-DIESEL-1L', 4, FALSE),
  ('Oil filter overdue for replacement', 'OIL-FILTER', 1, FALSE),
  ('Oil filter housing leaking or filter seal damaged', 'OIL-FILTER', 1, FALSE),
  ('Oil filter replacement included in PMS package', 'OIL-FILTER', 1, TRUE),
  ('Engine air filter clogged with dust', 'AIR-FILTER', 1, FALSE),
  ('Engine air filter damaged or improperly seated', 'AIR-FILTER', 1, FALSE),
  ('Air intake pipe cracked near filter housing', 'AIR-INTAKE-HOSE', 1, FALSE),
  ('Cabin air filter heavily contaminated', 'CABIN-FILTER', 1, FALSE),
  ('Cabin filter torn or moisture damaged', 'CABIN-FILTER', 1, FALSE),
  ('Additional cabin blower intake filter restricted (if equipped)', 'CABIN-BLOWER-FILTER', 1, FALSE),
  ('Battery test shows weak cold-cranking performance', 'BATTERY-NS40', 1, FALSE),
  ('Battery cannot hold charge; size confirmation needed', 'BATTERY-55D23', 1, FALSE),
  ('Battery terminals corroded or loose', 'BATTERY-TERMINAL', 1, FALSE),
  ('Battery terminals corroded or loose', 'BATTERY-GREASE', 1, FALSE),
  ('Diesel fuel filter contaminated; water/particles detected', 'FUEL-FILTER-DIESEL', 1, FALSE),
  ('Diesel fuel filter contaminated; water/particles detected', 'FUEL-FILTER-O-RING', 1, FALSE),
  ('Gasoline fuel filter restricted; flow test required', 'FUEL-FILTER-GAS', 1, FALSE),
  ('Fuel filter housing seal leaking', 'FUEL-FILTER-O-RING', 1, FALSE),
  ('Engine oil filler cap seal hardened or leaking', 'OIL-FILL-CAP', 1, FALSE),
  ('Oil filler cap missing or damaged', 'OIL-FILL-CAP', 1, FALSE),
  ('Drain plug washer leaking; replace seal', 'OIL-DRAIN-WASHER', 1, FALSE),
  ('Engine drain plug threads damaged; repair assessment required', 'OIL-DRAIN-PLUG', 1, FALSE),
  ('Engine drain plug threads damaged; repair assessment required', 'OIL-DRAIN-WASHER', 1, FALSE),
  ('Engine oil pan gasket seeping oil', 'OIL-PAN-GASKET', 1, FALSE),
  ('Engine oil pan seal leaking heavily; reseal required', 'OIL-PAN-GASKET', 1, FALSE),
  ('Engine oil pan seal leaking heavily; reseal required', 'OIL-REG-1L', 1, FALSE),
  ('Valve clearance out of manufacturer tolerance', 'VALVE-CLEARANCE-SHIM', 1, FALSE),
  ('Valve cover gasket leaking engine oil', 'VALVE-COVER-GASKET', 1, FALSE),
  ('Valve cover bolt grommets hardened; oil seepage', 'VALVE-COVER-GROMMET', 1, FALSE),
  ('Valve cover bolt grommets hardened; oil seepage', 'VALVE-COVER-GASKET', 1, FALSE),
  ('Automatic transmission fluid degraded or burnt', 'TRANSMISSION-FLUID-ATF', 4, FALSE),
  ('Manual transmission gear oil below specification', 'TRANSMISSION-FLUID-MTF', 2, FALSE),
  ('Transmission pan gasket leaking ATF', 'TRANSMISSION-PAN-GASKET', 1, FALSE),
  ('Transmission pan gasket leaking ATF', 'TRANSMISSION-FLUID-ATF', 1, FALSE),
  ('Transmission filter restricted with debris', 'TRANSMISSION-FILTER', 1, FALSE),
  ('Transmission filter restricted with debris', 'TRANSMISSION-PAN-GASKET', 1, FALSE),
  ('Clutch hydraulic fluid low or contaminated', 'CLUTCH-FLUID', 1, FALSE),
  ('Clutch hydraulic pressure loss; slave cylinder leaking', 'CLUTCH-SLAVE-CYL', 1, FALSE),
  ('Clutch hydraulic pressure loss; slave cylinder leaking', 'CLUTCH-FLUID', 1, FALSE),
  ('Clutch master cylinder internal leak suspected', 'CLUTCH-MASTER-KIT', 1, FALSE),
  ('Clutch master cylinder internal leak suspected', 'CLUTCH-FLUID', 1, FALSE),
  ('Differential oil service due or degraded', 'DIFF-GEAR-OIL', 2, FALSE),
  ('Differential cover seepage; gasket deteriorated', 'DIFF-COVER-GASKET', 1, FALSE),
  ('Differential cover seepage; gasket deteriorated', 'DIFF-GEAR-OIL', 1, FALSE),
  ('Hydraulic power steering fluid low; inspect leakage', 'PS-FLUID', 1, FALSE),
  ('Power steering fluid contaminated or foaming', 'PS-FLUID', 1, FALSE),
  ('Power steering pump noisy under steering load', 'PS-PUMP', 1, FALSE),
  ('Power steering pump noisy under steering load', 'PS-FLUID', 1, FALSE),
  ('Power steering pump shaft seal leaking', 'PS-PUMP', 1, FALSE),
  ('Power steering pump shaft seal leaking', 'PS-FLUID', 1, FALSE),
  ('Power steering pressure hose leaking near pump', 'PS-HOSE', 1, FALSE),
  ('Power steering pressure hose leaking near pump', 'PS-FLUID', 1, FALSE),
  ('Steering rack internal leakage detected', 'STEERING-RACK', 1, FALSE),
  ('Excessive rack and pinion play or knocking', 'STEERING-RACK', 1, FALSE),
  ('Steering rack boot torn with grease exposure', 'STEERING-RACK-BOOT', 1, FALSE),
  ('Rack dust boot cracked and not sealing', 'STEERING-RACK-BOOT', 1, FALSE),
  ('Inner tie rod rack end has excessive play', 'STEERING-RACK-END', 1, FALSE),
  ('Rack end ball joint dust seal failed', 'STEERING-RACK-END', 1, FALSE),
  ('Outer tie rod end loose or knocking', 'TIE-ROD-END', 1, FALSE),
  ('Tie rod end dust boot split; joint contamination', 'TIE-ROD-END', 1, FALSE),
  ('Front shock absorber oil leakage observed', 'SHOCK-FRONT', 1, FALSE),
  ('Front strut damping weak or excessive bouncing', 'SHOCK-FRONT', 1, FALSE),
  ('Rear shock absorber leaking oil', 'SHOCK-REAR', 1, FALSE),
  ('Rear suspension bounces excessively after rebound', 'SHOCK-REAR', 1, FALSE),
  ('Front or rear shock mounting cracked', 'SHOCK-MOUNT', 1, FALSE),
  ('Shock mounting bearing noisy or loose', 'SHOCK-MOUNT', 1, FALSE),
  ('Stabilizer link joint loose with rattling', 'STABILIZER-LINK', 1, FALSE),
  ('Stabilizer link boot torn with joint play', 'STABILIZER-LINK', 1, FALSE),
  ('Lower control arm bent or cracked', 'CONTROL-ARM-LOWER', 1, FALSE),
  ('Lower control arm rubber bush deteriorated', 'CONTROL-ARM-BUSH', 1, FALSE),
  ('Lower suspension ball joint has excessive play', 'BALL-JOINT', 1, FALSE),
  ('Upper control arm ball joint worn', 'CONTROL-ARM-UPPER', 1, FALSE),
  ('Upper arm rubber bush cracked', 'CONTROL-ARM-BUSH', 1, FALSE),
  ('Tires below safe tread depth; confirm correct size', 'TIRE-185-65R15', 2, FALSE),
  ('Tire sidewall bulge or cut; replacement required', 'TIRE-265-65R17', 1, FALSE),
  ('Tire losing pressure from leaking valve', 'TIRE-VALVE', 1, FALSE),
  ('Repairable tread puncture detected; inspect puncture location', 'TIRE-PATCH', 1, FALSE),
  ('Wheel lug nuts missing or rounded', 'LUG-NUT', 2, FALSE),
  ('Wheel stud threads stripped or broken', 'WHEEL-STUD', 1, FALSE),
  ('Wheel stud threads stripped or broken', 'LUG-NUT', 1, FALSE),
  ('Front brake pads below wear specification', 'BRAKE-PADS-FRONT', 1, FALSE),
  ('Rear disc brake pads worn unevenly', 'BRAKE-PADS-REAR', 1, FALSE),
  ('Brake pad contamination from grease or fluid', 'BRAKE-PADS-FRONT', 1, FALSE),
  ('Rear drum brake shoes lining worn', 'BRAKE-SHOE-SET', 1, FALSE),
  ('Rear brake shoe lining contaminated with oil/fluid', 'BRAKE-SHOE-SET', 1, FALSE),
  ('Brake fluid overdue; moisture/condition concern', 'BRAKE-FLUID-DOT4', 2, FALSE),
  ('Brake fluid low; inspect brake hydraulics for leaks', 'BRAKE-FLUID-DOT4', 1, FALSE),
  ('Brake drum scoring or excessive internal wear', 'BRAKE-DRUM', 2, FALSE),
  ('Rear brake drum cracked or out of tolerance', 'BRAKE-DRUM', 1, FALSE),
  ('Brake rotor below minimum thickness or heavily scored', 'BRAKE-ROTOR', 2, FALSE),
  ('Brake rotor lateral runout suspected; measurement required', 'BRAKE-ROTOR', 1, FALSE),
  ('Brake caliper piston seized or sticking', 'BRAKE-CALIPER-KIT', 1, FALSE),
  ('Caliper housing damaged or bleeding screw seized', 'BRAKE-CALIPER', 1, FALSE),
  ('Brake caliper flexible hose leaking', 'BRAKE-HOSE', 1, FALSE),
  ('Brake master cylinder internal bypass suspected', 'BRAKE-MASTER-CYL', 1, FALSE),
  ('Brake master cylinder internal bypass suspected', 'BRAKE-FLUID-DOT4', 1, FALSE),
  ('Brake master cylinder external leak', 'BRAKE-MASTER-CYL', 1, FALSE),
  ('Brake master cylinder external leak', 'BRAKE-FLUID-DOT4', 1, FALSE),
  ('Rear wheel cylinder leaking brake fluid', 'BRAKE-WHEEL-CYL', 1, FALSE),
  ('Rear wheel cylinder leaking brake fluid', 'BRAKE-FLUID-DOT4', 1, FALSE),
  ('Rear wheel cylinder piston seized', 'BRAKE-WHEEL-CYL', 1, FALSE),
  ('Spark plugs worn electrodes or excessive gap', 'SPARK-PLUG-NICKEL', 4, FALSE),
  ('Spark plug fouled with carbon/oil; engine diagnosis needed', 'SPARK-PLUG-IRIDIUM', 4, FALSE),
  ('Ignition coil misfire under load (test-confirmed)', 'IGNITION-COIL', 1, FALSE),
  ('Ignition coil boot carbon tracking or cracked insulation', 'IGNITION-COIL-BOOT', 1, FALSE),
  ('Starter motor cranks slowly despite healthy battery', 'STARTER-MOTOR', 1, FALSE),
  ('Starter solenoid intermittent click/no crank', 'STARTER-SOLENOID', 1, FALSE),
  ('Radiator coolant leak at core or tank seam', 'RADIATOR', 1, FALSE),
  ('Radiator coolant leak at core or tank seam', 'COOLANT-1L', 2, FALSE),
  ('Radiator pressure cap fails pressure test', 'RADIATOR-CAP', 1, FALSE),
  ('Radiator internal blockage or overheating suspected', 'RADIATOR', 1, FALSE),
  ('Radiator cooling fan motor not operating', 'RADIATOR-FAN', 1, FALSE),
  ('Cooling fan relay failed functional test', 'FAN-RELAY', 1, FALSE),
  ('Upper radiator hose swollen, cracked or seeping', 'RADIATOR-HOSE-UPPER', 1, FALSE),
  ('Upper radiator hose swollen, cracked or seeping', 'RADIATOR-CLAMP', 2, FALSE),
  ('Lower radiator hose deteriorated or leaking', 'RADIATOR-HOSE-LOWER', 1, FALSE),
  ('Lower radiator hose deteriorated or leaking', 'RADIATOR-CLAMP', 2, FALSE),
  ('Radiator hose clamp corroded/loose', 'RADIATOR-CLAMP', 2, FALSE),
  ('Engine coolant low or diluted; pressure test recommended', 'COOLANT-1L', 2, FALSE),
  ('Coolant heavily contaminated or service interval exceeded', 'COOLANT-CONCENTRATE', 2, FALSE),
  ('Engine thermostat suspected stuck causing overheating', 'THERMOSTAT', 1, FALSE),
  ('Engine thermostat suspected stuck causing overheating', 'COOLANT-1L', 1, FALSE),
  ('Coolant reservoir cracked or visibly leaking', 'COOLANT-RESERVOIR', 1, FALSE),
  ('Coolant expansion tank cap or hose connection damaged', 'COOLANT-RESERVOIR', 1, FALSE),
  ('Timing belt cracked or overdue per manufacturer interval', 'TIMING-BELT-KIT', 1, FALSE),
  ('Timing tensioner noisy or belt tracking abnormal', 'TIMING-TENSIONER', 1, FALSE),
  ('Timing tensioner noisy or belt tracking abnormal', 'TIMING-BELT-KIT', 1, FALSE),
  ('Air-con compressor drive belt frayed or glazed', 'AC-COMPRESSOR-BELT', 1, FALSE),
  ('A/C belt loose or squealing; inspect alignment', 'AC-COMPRESSOR-BELT', 1, FALSE),
  ('Alternator drive belt worn or slipping', 'ALTERNATOR-BELT', 1, FALSE),
  ('Alternator belt squeals under electrical load', 'ALTERNATOR-BELT', 1, FALSE),
  ('Power steering drive belt cracked', 'PS-DRIVE-BELT', 1, FALSE),
  ('Power steering pump belt squealing on turns', 'PS-DRIVE-BELT', 1, FALSE),
  ('Serpentine accessory belt cracked or glazed', 'SERPENTINE-BELT', 1, FALSE),
  ('Accessory belt tensioner weak or noisy', 'BELT-TENSIONER', 1, FALSE),
  ('Accessory belt tensioner weak or noisy', 'SERPENTINE-BELT', 1, FALSE),
  ('Camshaft oil seal leaking around timing cover', 'CAMSHAFT-SEAL', 1, FALSE),
  ('Camshaft seal hardened; seepage along cylinder head', 'CAMSHAFT-SEAL', 1, FALSE),
  ('Front crankshaft seal leaking engine oil', 'CRANKSHAFT-SEAL', 1, FALSE),
  ('Rear crankshaft seal suspected; confirm leak source', 'CRANKSHAFT-SEAL', 1, FALSE),
  ('Transmission output/axle seal seeping fluid', 'TRANSMISSION-AXLE-SEAL', 1, FALSE),
  ('Transmission output/axle seal seeping fluid', 'TRANSMISSION-FLUID-ATF', 1, FALSE),
  ('Transmission oil seal damaged near axle housing', 'TRANSMISSION-AXLE-SEAL', 1, FALSE),
  ('CV joint clicking on turns; confirm affected side', 'CV-JOINT', 1, FALSE),
  ('CV joint excessive axial/radial play', 'CV-JOINT', 1, FALSE),
  ('CV boot torn with grease loss', 'CV-BOOT-KIT', 1, FALSE),
  ('CV boot clamp missing; contamination risk', 'CV-BOOT-KIT', 1, FALSE),
  ('Drive axle shaft vibration or runout suspected', 'DRIVE-AXLE', 1, FALSE),
  ('Axle damaged at spline/seal area', 'DRIVE-AXLE', 1, FALSE),
  ('Axle damaged at spline/seal area', 'AXLE-SEAL', 1, FALSE),
  ('Throttle body carbon accumulation; idle unstable', 'THROTTLE-CLEANER', 1, FALSE),
  ('Throttle body carbon accumulation; idle unstable', 'THROTTLE-GASKET', 1, FALSE),
  ('Electronic throttle body actuator failed testing', 'THROTTLE-BODY', 1, FALSE),
  ('Electronic throttle body actuator failed testing', 'THROTTLE-GASKET', 1, FALSE),
  ('Intake manifold gasket vacuum leak detected', 'INTAKE-MANIFOLD-GASKET', 1, FALSE),
  ('Air intake vacuum hose cracked or detached', 'VACUUM-HOSE', 1, FALSE),
  ('MAF sensor contaminated; cleaning/diagnosis advised', 'MAF-CLEANER', 1, FALSE),
  ('MAF sensor signal out of specification (test-confirmed)', 'MAF-SENSOR', 1, FALSE),
  ('Oxygen sensor heater circuit malfunction verified', 'O2-SENSOR', 1, FALSE),
  ('Oxygen sensor slow response confirmed by scan data', 'O2-SENSOR', 1, FALSE),
  ('Turbocharger boost hose split causing loss of power', 'TURBO-HOSE', 1, FALSE),
  ('Turbocharger bearing noise/oil leakage confirmed', 'TURBO-CHARGER', 1, FALSE),
  ('Turbocharger bearing noise/oil leakage confirmed', 'TURBO-GASKET-KIT', 1, FALSE),
  ('Turbo oil feed/return gasket seeping', 'TURBO-GASKET-KIT', 1, FALSE),
  ('EGR valve stuck from carbon deposits', 'EGR-CLEANER', 1, FALSE),
  ('EGR valve stuck from carbon deposits', 'EGR-GASKET', 1, FALSE),
  ('EGR valve actuator/position sensor fault confirmed', 'EGR-VALVE', 1, FALSE),
  ('EGR valve actuator/position sensor fault confirmed', 'EGR-GASKET', 1, FALSE),
  ('Exhaust/EGR pipe flange gasket leaking', 'EXHAUST-GASKET', 1, FALSE),
  ('Headlight bulb failed illumination test', 'HEADLAMP-BULB-H4', 1, FALSE),
  ('Headlamp housing cracked or water ingress', 'HEADLAMP-ASSEMBLY', 1, FALSE),
  ('Headlamp lighting relay fault verified', 'HORN-RELAY', 1, FALSE),
  ('Turn signal bulb not operating', 'SIGNAL-BULB-T20', 1, FALSE),
  ('Signal lamp housing broken or loose', 'SIGNAL-LAMP', 1, FALSE),
  ('Turn signal connector corroded or heat damaged', 'WIRE-CONNECTOR', 1, FALSE),
  ('Parking/position lamp bulb not working', 'PARK-BULB-T10', 1, FALSE),
  ('Parking lamp lens damaged or water ingress', 'PARK-LAMP', 1, FALSE),
  ('Fog lamp bulb failed function test', 'FOG-BULB-H11', 1, FALSE),
  ('Fog lamp housing shattered or bracket broken', 'FOG-LAMP', 1, FALSE);

-- Refuse to guess if an existing barcode collides with a different named product.
-- Also reject ambiguous duplicate names to prevent linking the wrong SKU/finding.
DO $seed_validate$
BEGIN
  IF EXISTS (
    SELECT 1 FROM _acdf_inventory_seed s
    JOIN public.inventory i ON i.barcode = 'ACDF26-' || s.sku
    WHERE lower(btrim(i.name)) <> lower(btrim(s.name))
  ) THEN
    RAISE EXCEPTION 'Seed barcode conflicts with an existing item name; no data was written.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM _acdf_inventory_seed s
    WHERE (SELECT count(*) FROM public.inventory i WHERE lower(btrim(i.name)) = lower(btrim(s.name))) > 1
      AND NOT EXISTS (SELECT 1 FROM public.inventory i2 WHERE i2.barcode = 'ACDF26-' || s.sku)
  ) THEN
    RAISE EXCEPTION 'Ambiguous existing inventory names; resolve duplicates before seeding.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM _acdf_finding_seed s
    WHERE (SELECT count(*) FROM public.default_findings f WHERE lower(btrim(f.title)) = lower(btrim(s.title))) > 1
  ) THEN
    RAISE EXCEPTION 'Ambiguous existing Default Finding titles; resolve duplicates before seeding.';
  END IF;
  IF EXISTS (SELECT 1 FROM _acdf_part_seed p WHERE NOT EXISTS (SELECT 1 FROM _acdf_inventory_seed i WHERE i.sku=p.sku)) THEN
    RAISE EXCEPTION 'Seed part references an undefined inventory SKU.';
  END IF;
  IF EXISTS (SELECT 1 FROM _acdf_part_seed p WHERE NOT EXISTS (SELECT 1 FROM _acdf_finding_seed f WHERE f.title=p.finding_title)) THEN
    RAISE EXCEPTION 'Seed part references an undefined Default Finding title.';
  END IF;
  IF EXISTS (SELECT 1 FROM _acdf_part_seed WHERE quantity < 1) THEN
    RAISE EXCEPTION 'Default finding part quantity must be positive.';
  END IF;
END;
$seed_validate$;

CREATE TEMP TABLE _acdf_created_inventory (id uuid PRIMARY KEY, barcode text NOT NULL) ON COMMIT DROP;
WITH new_items AS (
  INSERT INTO public.inventory (name, description, barcode, quantity, unit, cost_price, selling_price, reorder_level, low_stock_alert, active)
  SELECT s.name,
    'UNVERIFIED SAMPLE STOCK (AutoCare seed). Confirm fitment, physical quantity, actual PHP prices and supplier before using.',
    'ACDF26-' || s.sku, s.sample_quantity, s.unit, s.cost_price, s.selling_price,
    s.reorder_level, TRUE, TRUE
  FROM _acdf_inventory_seed s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory i WHERE i.barcode = 'ACDF26-' || s.sku
       OR lower(btrim(i.name)) = lower(btrim(s.name))
  )
  ON CONFLICT (barcode) DO NOTHING
  RETURNING id, barcode
) INSERT INTO _acdf_created_inventory (id, barcode) SELECT id, barcode FROM new_items;

-- Bind each SKU to its inserted/reused real inventory row; do not change reused stock.
CREATE TEMP TABLE _acdf_inventory_map ON COMMIT DROP AS
SELECT s.sku, COALESCE(
    (SELECT i.id FROM public.inventory i WHERE i.barcode = 'ACDF26-' || s.sku LIMIT 1),
    (SELECT i.id FROM public.inventory i WHERE lower(btrim(i.name)) = lower(btrim(s.name)) LIMIT 1)
  ) AS inventory_id
FROM _acdf_inventory_seed s;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM _acdf_inventory_map WHERE inventory_id IS NULL) THEN
    RAISE EXCEPTION 'Unresolved inventory linkage: rolling back all generated data.';
  END IF;
END $$;

CREATE TEMP TABLE _acdf_created_findings (id uuid PRIMARY KEY, title text NOT NULL) ON COMMIT DROP;
WITH new_findings AS (
  INSERT INTO public.default_findings (title, is_active)
  SELECT s.title, TRUE FROM _acdf_finding_seed s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.default_findings f WHERE lower(btrim(f.title)) = lower(btrim(s.title))
  )
  RETURNING id, title
) INSERT INTO _acdf_created_findings (id, title) SELECT id, title FROM new_findings;

CREATE TEMP TABLE _acdf_finding_map ON COMMIT DROP AS
SELECT s.title, s.item_key,
  (SELECT f.id FROM public.default_findings f WHERE lower(btrim(f.title)) = lower(btrim(s.title)) LIMIT 1) AS finding_id
FROM _acdf_finding_seed s;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM _acdf_finding_map WHERE finding_id IS NULL) THEN
    RAISE EXCEPTION 'Unresolved Default Finding linkage: rolling back all generated data.';
  END IF;
END $$;

-- Parts are added ONLY to newly inserted Default Findings: pre-existing templates are untouched.
CREATE TEMP TABLE _acdf_created_parts (id uuid PRIMARY KEY) ON COMMIT DROP;
WITH new_parts AS (
  INSERT INTO public.default_finding_parts (finding_id, part_name, quantity, price_at_time, is_pms, inventory_item_id)
  SELECT f.id, i.name, p.quantity, CASE WHEN p.is_pms THEN 0.00 ELSE i.selling_price END,
    p.is_pms, i.id
  FROM _acdf_part_seed p
  JOIN _acdf_created_findings f ON f.title = p.finding_title
  JOIN _acdf_inventory_map m ON m.sku = p.sku
  JOIN public.inventory i ON i.id = m.inventory_id
  RETURNING id
) INSERT INTO _acdf_created_parts (id) SELECT id FROM new_parts;

-- Link each imported/reused Default Finding to the matching existing checklist item key.
-- No appointment finding or checklist row is created/edited by this catalog seed.
CREATE TEMP TABLE _acdf_created_links (id uuid PRIMARY KEY) ON COMMIT DROP;
WITH new_links AS (
  INSERT INTO public.diagnostic_finding_links (item_key, default_finding_id)
  SELECT m.item_key, m.finding_id FROM _acdf_finding_map m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.diagnostic_finding_links d
    WHERE d.item_key=m.item_key AND d.default_finding_id=m.finding_id
  )
  ON CONFLICT (item_key, default_finding_id) DO NOTHING
  RETURNING id
) INSERT INTO _acdf_created_links (id) SELECT id FROM new_links;

-- Summary: On second run, all newly inserted counts should be 0.
SELECT
  (SELECT count(*) FROM _acdf_inventory_seed) AS planned_inventory_skus,
  (SELECT count(*) FROM _acdf_finding_seed) AS planned_default_findings,
  (SELECT count(*) FROM _acdf_part_seed) AS planned_finding_parts,
  (SELECT count(DISTINCT item_key) FROM _acdf_finding_seed) AS covered_checklist_items,
  (SELECT count(*) FROM _acdf_created_inventory) AS newly_inserted_inventory,
  (SELECT count(*) FROM _acdf_created_findings) AS newly_inserted_default_findings,
  (SELECT count(*) FROM _acdf_created_parts) AS newly_inserted_finding_parts,
  (SELECT count(*) FROM _acdf_created_links) AS newly_inserted_checklist_links;
COMMIT;

-- OPTIONAL READ-ONLY VERIFICATION, works after COMMIT:
SELECT i.name, i.barcode, i.quantity, i.reorder_level, i.selling_price, i.active
FROM public.inventory i WHERE i.barcode LIKE 'ACDF26-%' ORDER BY i.name;
-- Generated stock quantities are examples only: physically verify them before operational use.
-- No existing stock quantities or prices are overwritten by this seed.

