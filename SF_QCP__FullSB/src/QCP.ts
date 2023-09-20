export function onBeforeCalculate(quote, lines, conn) {
    return new Promise((resolve, reject) => {
        console.log("[DEBUG] Entering onBeforeCalculate");

        try {
            console.log("[DEBUG] Quote State Before Calculation:", quote);
            console.log("[DEBUG] Lines State Before Calculation:", lines);
        } catch (e) {
            console.log("[ERROR]", e);
        }
        
        
        // Call cascadeFields to handle line cascading
        console.log("[DEBUG] About to call cascadeFields");
        cascadeFields(quote, lines);

        console.log("[DEBUG] Exiting onBeforeCalculate");
        resolve();
    }).catch(error => {
        console.log("[ERROR]", error);
    });
}

// MVM
// Function that is responsible to control the cascade functionality
// It calls one function per field
function cascadeFields(quote, lines){
    console.log("[DEBUG] Entering cascadeFields");

    // Call cascadeQuantity to handle quantity cascading
    console.log("[DEBUG] About to call cascadeQuantity");
    cascadeQuantity(quote, lines);

    console.log("[DEBUG] Exiting cascadeFields");
}

//MVM
// Function that handles the quantity cascading feature
function cascadeQuantity(quote, lines){
    console.log("[DEBUG] Entering cascadeQuantity");

    let bundleLines = lines.filter(line => line.components.length > 0);
    let quoteMinimumQuantity = findMinimumQuantity(lines);  

    console.log("[DEBUG] Number of bundle lines:", bundleLines.length);
    console.log("[DEBUG] Quote minimum quantity:", quoteMinimumQuantity);

    bundleLines.forEach((bundle, bundleIndex) => {
        console.log(`[DEBUG] Processing bundle ${bundleIndex + 1} of ${bundleLines.length}`);
        console.log(`[DEBUG] Salesforce ID for this bundle: ${bundle.record.Id}`);  // Outputting Salesforce ID

        bundle.components.forEach((component, componentIndex) => {
            console.log(`[DEBUG] Processing component ${componentIndex + 1} of ${bundle.components.length}`);

            let currentQuantity = component.record.Override_Quantity__c ? component.record.Override_Quantity__c : bundle.record.SBQQ__Quantity__c;
            console.log("[DEBUG] Calculated currentQuantity:", currentQuantity);

            if (isQuantityCascadeEligible(component, currentQuantity, quoteMinimumQuantity)) {
                console.log("[DEBUG] Component is eligible for quantity cascade. Updating SBQQ__Quantity__c.");
                component.record.SBQQ__Quantity__c = currentQuantity;
            } else {
                console.log("[DEBUG] Component is NOT eligible for quantity cascade. Skipping update.");
            }

            console.log("[DEBUG] Final component SBQQ__Quantity__c:", component.record.SBQQ__Quantity__c);
        });
    });

    console.log("[DEBUG] Exiting cascadeQuantity");
}

// MVM
// Function that determines if the line is eligible to have the License Type cascaded 
function isQuantityCascadeEligible(line, currentBundleQuantity, quoteMinimumQuantity){
    console.log("[DEBUG] Entering isQuantityCascadeEligible");

    let isEligible = !(line.record.Exclude_Quantity_Cascade__c);
    console.log("[DEBUG] Eligibility for quantity cascade:", isEligible);

    console.log("[DEBUG] Exiting isQuantityCascadeEligible");
    return isEligible;
}