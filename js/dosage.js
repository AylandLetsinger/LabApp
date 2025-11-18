// PURPOSE OF SCRIPT:
// This file contains all of the JavaScript for the dosage calculators.
// It controls the functionality of the dosage calculators, including 
// handling user input, responding to events, and manipulating the Document Object Model (DOM). 

console.log("dosage.js is working!"); // Indicates that the script is working 

// IP Injection by Body Weight Calculator
document.addEventListener('DOMContentLoaded', function() {
    const formIP1 = document.getElementById('dosage-ip-bw-1-form'); // Get the first form for dosage IP by body weight
    const formIP2 = document.getElementById('dosage-ip-bw-2-form'); // Get the second form for dosage IP by body weight

    // Hide Step 3 Second Form
    formIP2.style.display = 'none'; // Hide the second form
    
    // Declare Form 1 variables outside of the event listeners so they're accessible in Form 2
    let dose, doseUnit, bodyweight, bodyweightUnit;

    // Step 3 Form Submission - Part 1
    formIP1.addEventListener('submit', function(event) { // Add an event listener for the first form
        event.preventDefault(); // Prevent the default form submission behavior
        console.log('formIP1 submitted'); // Indicates that the form was submitted

        // Get input values
        dose = parseFloat(document.getElementById('dose').value);
        doseUnit = document.getElementById('dose-unit').value;
        bodyweight = parseFloat(document.getElementById('bodyweight').value);
        bodyweightUnit = document.getElementById('bodyweight-unit').value;

        // Log the values for debugging
        console.log(`Dose: ${dose} ${doseUnit}, Weight: ${bodyweight} ${bodyweightUnit}`);

        // Display the second form after user hits continue
        document.getElementById('dosage-ip-bw-2-form').style.display = 'block'; // Display the second form
    }); // end of formIP1 event listener   
    
    // Step 3 Form Submission - Part 2
    formIP2.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission behavior
        console.log('formIP2 submitted'); // Indicates that the form was submitted

        // Get input values
        const volumeinj = parseFloat(document.getElementById('volume-inj').value);
        const volumeinjUnit = document.getElementById('volume-inj-unit').value;
        const weightinj = parseFloat(document.getElementById('weight').value);
        const weightinjUnit = document.getElementById('weight-unit').value;
        const avgweight = parseFloat(document.getElementById('avg-weight').value);
        const avgweightUnit = document.getElementById('avg-weight-unit').value;
        const totalinjections = parseFloat(document.getElementById('total-injections').value);
        const wastebuffer = document.getElementById('waste-buffer').value;

        // Log the values for debugging
        console.log(`Volume: ${volumeinj} ${volumeinjUnit}, Body Weight: ${bodyweight} ${bodyweightUnit}, Average Weight: ${avgweight} ${avgweightUnit}, Total Injections: ${totalinjections}, Waste Buffer: ${wastebuffer}`);

        // Step 4 Perform Calculations and Output
            // Convert all input values to base units
            const doseBase = dosageIPBWconvertToBase(dose, doseUnit, 'dose');
            const bodyweightBase = dosageIPBWconvertToBase(bodyweight, bodyweightUnit, 'bodyWeight');
            const volumeinjBase = dosageIPBWconvertToBase(volumeinj, volumeinjUnit, 'injVolume');
            const weightinjBase = dosageIPBWconvertToBase(weightinj, weightinjUnit, 'injWeight');
            const avgweightBase = dosageIPBWconvertToBase(avgweight, avgweightUnit, 'avgWeight');

            // Log the base values for debugging
            console.log(`Base Values: doseBase: ${doseBase}, bodyweightBase: ${bodyweightBase}, volumeinjBase: ${volumeinjBase}, weightinjBase: ${weightinjBase}, avgweightBase: ${avgweightBase}`);

            // Calculate outputs in base units    
            const dosePerAvgSubj = ( doseBase / bodyweightBase ) * avgweightBase;
            const reqSolute = dosePerAvgSubj * totalinjections * (1 + (wastebuffer/100));
            const volPerAvgInj = (volumeinjBase / weightinjBase) * avgweightBase;
            const totalVolume = volPerAvgInj * totalinjections * (1 + (wastebuffer/100));
            const finalConc = reqSolute / totalVolume;
            const initialSolute = reqSolute;
            const totalYield = reqSolute / dosePerAvgSubj;

            // Log the calculated values for debugging
            console.log(`Calculated Values: dosePerAvgSubj: ${dosePerAvgSubj}, reqSolute: ${reqSolute}, volPerAvgInj: ${volPerAvgInj}, totalVolume: ${totalVolume}, finalConc: ${finalConc}, totalYield: ${totalYield}`);

            // Display the outputs
            document.getElementById('dose-per-avg-subj').value = dosePerAvgSubj;
            document.getElementById('total-solute').value = reqSolute;
            document.getElementById('volume-per-avg-subj').value = volPerAvgInj;
            document.getElementById('total-volume').value = totalVolume;
            document.getElementById('concentration').value = finalConc;
            document.getElementById('total-yield').value = totalYield;

            // Enable conversion of outputs to user-selected units
                // Define original units
                const originalUnits = {
                    dosePerAvgSubj: 'mg',
                    reqSolute: 'mg',
                    volPerAvgInj: 'ml',
                    totalVolume: 'ml',
                    finalConc: 'mg',
                    initSolute: 'mg',
                };

            // Conversion Functions
            function updateDosePerAvgSubj() {
                const dosePerAvgSubj = parseFloat(document.getElementById('dose-per-avg-subj').value);
                const targetUnit = document.getElementById('dose-per-avg-subj-unit').value; // Target unit
                const originalUnit = originalUnits.dosePerAvgSubj; // Fetch the tracked original unit
                const dosePerAvgSubjConv = dosageIPBWconvertToUser(dosePerAvgSubj, originalUnit, targetUnit, 'mass');
                document.getElementById('dose-per-avg-subj').value = dosePerAvgSubjConv.toFixed(6);

                // Reset original unit to target unit after calculation
                originalUnits.dosePerAvgSubj = targetUnit;
            }
            
            function updateSolute() {
                const reqSolute = parseFloat(document.getElementById('total-solute').value);
                const targetUnit = document.getElementById('solute-unit').value;
                const originalUnit = originalUnits.reqSolute;
                const reqSoluteConv = dosageIPBWconvertToUser(reqSolute, originalUnit, targetUnit, 'mass');
                document.getElementById('total-solute').value = reqSoluteConv.toFixed(6);

                // Reset original unit to target unit after calculation
                originalUnits.reqSolute = targetUnit;
            }
            
            function updateVolPerAvgInj() {
                const volPerAvgInj = parseFloat(document.getElementById('volume-per-avg-subj').value);
                const targetUnit = document.getElementById('volume-per-avg-subj-unit').value;
                const originalUnit = originalUnits.volPerAvgInj;
                const volPerAvgInjConv = dosageIPBWconvertToUser(volPerAvgInj, originalUnit, targetUnit, 'volume');
                document.getElementById('volume-per-avg-subj').value = volPerAvgInjConv.toFixed(6);

                // Reset original unit to target unit after calculation
                originalUnits.volPerAvgInj = targetUnit;
            }
            
            function updateTotalVolume() {
                const totalVolume = parseFloat(document.getElementById('total-volume').value);
                const targetUnit = document.getElementById('total-volume-unit').value;
                const originalUnit = originalUnits.totalVolume;
                const totalVolumeConv = dosageIPBWconvertToUser(totalVolume, originalUnit, targetUnit, 'volume');
                document.getElementById('total-volume').value = totalVolumeConv.toFixed(6);

                // Reset original unit to target unit after calculation
                originalUnits.totalVolume = targetUnit;
            }
            
            function updateFinalConc() {
                const finalConc = parseFloat(document.getElementById('concentration').value);
                const targetUnit = document.getElementById('concentration-unit').value;
                const originalUnit = originalUnits.finalConc;
                const finalConcConv = dosageIPBWconvertToUser(finalConc, originalUnit, targetUnit, 'mass');
                document.getElementById('concentration').value = finalConcConv.toFixed(6);

                // Reset original unit to target unit after calculation
                originalUnits.finalConc = targetUnit;
            }

            function updateInitialSolute() {
                const initialSoluteInput = document.getElementById('initial-solute'); // Get the initial solute input
                let initialSolute = parseFloat(initialSoluteInput.value); // Get the current value of initialSolute
                const targetUnit = document.getElementById('initial-solute-unit').value; // Get the target unit from the dropdown
                const originalUnit = originalUnits.initSolute; // Use its own original unit
                
                // Convert initialSolute if the unit changes
                if (originalUnit !== targetUnit) {
                    const convertedSolute = dosageIPBWconvertToUser(initialSolute, originalUnit, targetUnit, 'mass');
                    initialSoluteInput.value = convertedSolute.toFixed(6); // Update the displayed value
                    initialSolute = convertedSolute; // Update the variable for further calculations
                }
            
                // Convert to base unit for totalYield calculation
                const initialSoluteBase = dosageIPBWconvertToBase(initialSolute, targetUnit, 'dose'); // Convert current value to base
                
                // Update totalYield
                const dosePerAvgSubj = parseFloat(document.getElementById('dose-per-avg-subj').value);
                const totalYield = initialSoluteBase / dosePerAvgSubj; // Use base unit for calculations
                document.getElementById('total-yield').value = totalYield.toFixed(6); // Update total yield
            
                // Update original unit for initialSolute
                originalUnits.initSolute = targetUnit; // Track the new original unit
            }
                    
            // Make initial solute adjustable by user input within the same unit
            const initialSoluteInput = document.getElementById('initial-solute'); // Get the initial solute input
            initialSoluteInput.value = reqSolute.toFixed(6); // Round to two decimal places
            initialSoluteInput.addEventListener('input', function () {
                const initialSolute = parseFloat(initialSoluteInput.value); // Get the manual input value
                const totalYield = initialSolute / dosePerAvgSubj; // Recalculate total yield
                document.getElementById('total-yield').value = totalYield.toFixed(6); // Update total yield
            });

            // Add event listener for unit dropdown to trigger conversions
            document.getElementById('dose-per-avg-subj-unit').addEventListener('change', updateDosePerAvgSubj);
            document.getElementById('solute-unit').addEventListener('change', updateSolute);
            document.getElementById('volume-per-avg-subj-unit').addEventListener('change', updateVolPerAvgInj);
            document.getElementById('total-volume-unit').addEventListener('change', updateTotalVolume);
            document.getElementById('concentration-unit').addEventListener('change', updateFinalConc);
            document.getElementById('initial-solute-unit').addEventListener('change', updateInitialSolute);

    }); // end of formIP2 event listener

}); // end of DOMContentLoaded event listener   


/// WHAT TO DO NEXT:
// - Add step 5 and 6 from google sheet to the calculator