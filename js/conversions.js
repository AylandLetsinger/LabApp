// PURPOSE OF SCRIPT:
// This file contains all of the JavaScript for converting units between calculators. 

// Conversion factors for dosage-ip-bw.html calcluations specified in dosage.js
const dosageIPBWconversionFactors = {
   // inputs
    dose: {
        mcg: 1e-3, // Base unit of dose for dosage per bodyweight
        mg: 1,
        g: 1e3,
        kg: 1e6,
    },
    bodyWeight: {
        mcg: 1e-9, // Base unit of weight for dosage per bodyweight
        mg: 1e-6,
        g: 1e-3,
        kg: 1,
    },
    injVolume: {
        ul: 1e-3, // Base unit of volume for volume per injection
        ml: 1,
        l: 1e3,
    },
    injWeight: {
        mcg: 1e-9, // Base unit of weight for volume per injection
        mg: 1e-6,
        g: 1e-3,
        kg: 1,
    },
    avgWeight: {
        mcg: 1e-9, // Base unit of weight for average weight per subject
        mg: 1e-6,
        g: 1e-3,
        kg: 1,
    },
    // outputs
    mass: {
        mcg: { mcg: 1, mg: 1e-3, g: 1e-6, kg: 1e-9 },
        mg: { mcg: 1e3, mg: 1, g: 1e-3, kg: 1e-6 },
        g: { mcg: 1e6, mg: 1e3, g: 1, kg: 1e-3 },
        kg: { mcg: 1e9, mg: 1e6, g: 1e3, kg: 1 },
    },
    volume: {
        ul: { ul: 1, ml: 1e-3, l: 1e-6 },
        ml: { ul: 1e3, ml: 1, l: 1e-3 },
        l: { ul: 1e6, ml: 1e3, l: 1 },
    },
};


function dosageIPBWconvertToBase(value, unit, type) {
    if (!dosageIPBWconversionFactors[type] || !dosageIPBWconversionFactors[type][unit]) {
        throw new Error(`Unknown unit '${unit}' for type '${type}'`);
    }
    return value * dosageIPBWconversionFactors[type][unit];
}

function dosageIPBWconvertToUser(value, originalUnit, targetUnit, type) {
    const conversionMap = dosageIPBWconversionFactors[type];
    const originalToTarget = conversionMap[originalUnit]?.[targetUnit];
    return value * originalToTarget;
}

