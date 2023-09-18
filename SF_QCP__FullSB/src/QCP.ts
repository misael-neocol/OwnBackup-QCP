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


export function onBeforePriceRules(quote, lines) {

    return new Promise((resolve, reject) => {

        console.log("[DEBUG] Entering onBeforePriceRules");

        //MVM
        /*
        clearGroupDiscountOnAmendment(quote);
        clearSourceOnRenewal(quote);
        resetTargetCustomerAmount(quote, lines)
        */

        //setDiscount(quote, lines);
        
        console.log("[DEBUG] Exiting onBeforePriceRules");

        resolve();
    });
}


export function onAfterCalculate(quote, lines) {

    return new Promise((resolve, reject) => {
        console.log("[DEBUG] Entering onAfterCalculate");
        try {
            console.log("[DEBUG] Quote State After Calculation:", quote);
            console.log("[DEBUG] Lines State After Calculation:", lines);
        } catch (e) {
            console.log("[ERROR]", e);
        }
 
        setQuoteLineGroupSegment(quote);
        sortAndValidateGroupDates(quote);
		setActualOneTimeDiscount(quote, lines);
		rollUpQuoteValues(quote, lines);
		
        compareRevenueandNetTotals(quote, lines);
        
        validateOnboardingCount(quote, lines);
        checkMinimumAmount(quote, lines);
        checkMinimumAmountPlatByosBr(quote, lines)

        // calculateLinesMRR(quote, lines);
        calculateRevenueMetrics(quote, lines)

        setQuoteLineYear(quote, lines);
        rollupQuoteMRR(quote, lines);

        rollUpActualOneTimeDiscount(quote, lines);
        
        console.log("[DEBUG] Exiting onAfterCalculate");

        resolve();
    });
}  

const DEBUG = true;

function debug(...args) {
    if(DEBUG) {
        console.log(...args);
    }
}

function calculateRevenueMetrics(quote, lines) {
    console.log("calculateRevenueMetrics__Start");
  
    // Loop through each quote line to apply the logic
    lines.forEach((quoteLine, index) => {

    //   console.log(`calculateRevenueMetrics__Processing quoteLine ${index + 1}`);
  
      const productCode = quoteLine.record.SBQQ__ProductCode__c;
      const isService = [
        "SRV-SECR-OBRD",
        "SRV-ARCH-OBRD",
        "SRV-PREM-PLUS",
        "SRV-PROF-SERV",
        "SRV-PE-SERV",
        "SRV-PREM-SUP",
        "SRV-TAM-SERV",
        "SRV-BR-OBRD",
        "SRV-SRA-SERV",
        "SRV-STD-SUP",
      ].includes(productCode);
  
      if (isService) {
        // console.log("calculateRevenueMetrics__SERVICE__SBQQ__Quote__c ", quoteLine.record.SBQQ__Quote__c );
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.SBQQ__ProductCode__c", quoteLine.record.SBQQ__ProductCode__c);
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.SBQQ__NetTotal__c", quoteLine.record.SBQQ__NetTotal__c);
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.SBQQ__ProrateMultiplier__c", quoteLine.record.SBQQ__ProrateMultiplier__c);
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.SBQQ__DefaultSubscriptionTerm__c", quoteLine.record.SBQQ__DefaultSubscriptionTerm__c);
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.Year__c", quoteLine.record.Year__c);
        
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record", quoteLine.record);


        // Service Quote Line logic
        // quoteLine.record.MRR_CPQ__c = 0; // Scott -> No need to populate this field for Service QLs
        quoteLine.record.ARR_CPQ__c = quoteLine.record.MRR_CPQ__c * 12;
        quoteLine.record.Services_CPQ__c = quoteLine.record.Year__c === 1 ? quoteLine.record.SBQQ__NetTotal__c : 0;
        quoteLine.record.First_Year_CPQ__c = quoteLine.record.Year__c === 1 ? true : false;

        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.MRR_CPQ__c", quoteLine.record.MRR_CPQ__c);
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.ARR_CPQ__c", quoteLine.record.ARR_CPQ__c);
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.Services_CPQ__c", quoteLine.record.Services_CPQ__c);
        // console.log("calculateRevenueMetrics__SERVICE__quoteLine.record.First_Year_CPQ__c", quoteLine.record.First_Year_CPQ__c);
      } else {        
        // console.log("calculateRevenueMetrics__RECURRING__SBQQ__Quote__c ", quoteLine.record.SBQQ__Quote__c );
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.SBQQ__ProductCode__c", quoteLine.record.SBQQ__ProductCode__c);
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.SBQQ__NetTotal__c", quoteLine.record.SBQQ__NetTotal__c);
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.SBQQ__ProrateMultiplier__c", quoteLine.record.SBQQ__ProrateMultiplier__c);
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.SBQQ__DefaultSubscriptionTerm__c", quoteLine.record.SBQQ__DefaultSubscriptionTerm__c);
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.Year__c", quoteLine.record.Year__c);
        
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record", quoteLine.record);


        // Recurring Quote Line logic
        quoteLine.record.MRR_CPQ__c = quoteLine.record.SBQQ__NetTotal__c / quoteLine.record.SBQQ__ProrateMultiplier__c / quoteLine.record.SBQQ__DefaultSubscriptionTerm__c;
        quoteLine.record.ARR_CPQ__c = quoteLine.record.MRR_CPQ__c * 12;
        quoteLine.record.Services_CPQ__c = quoteLine.record.Year__c === 1 ? quoteLine.record.SBQQ__NetTotal__c : 0;
        quoteLine.record.First_Year_CPQ__c = quoteLine.record.Year__c === 1 ? true : false; 

        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.MRR_CPQ__c", quoteLine.record.MRR_CPQ__c);
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.ARR_CPQ__c", quoteLine.record.ARR_CPQ__c);
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.Services_CPQ__c", quoteLine.record.Services_CPQ__c);
        // console.log("calculateRevenueMetrics__RECURRING__quoteLine.record.First_Year_CPQ__c", quoteLine.record.First_Year_CPQ__c);
      }
    });
  
    console.log("calculateRevenueMetrics__End");
  }  


function validateOnboardingCount(quote, lines){

    //Reset the Has Onboarding Error
    quote.record.Has_Onboarding_Error__c = false;
    //Get a list of all onboarding quote lines
    let onboardingProducts = lines.filter(line => line.record.Is_Onboarding_Product__c);
    //Get a list of ProductCode | Number of occurrences (count of product codes in a group by by product code)
    let productCounts = onboardingProducts.reduce((acc, line) => {
        let productCode = line.record.SBQQ__ProductCode__c;
      
        if (productCode in acc) {
          acc[productCode]++;
        } else {
          acc[productCode] = 1;
        }
      
        return acc;
      }, {});

      let hasMoreThanTwoOccurrences = false;

      for (let productCode in productCounts) {
        if (productCounts.hasOwnProperty(productCode) && productCounts[productCode] > 1) {
          quote.record.Has_Onboarding_Error__c = true;
          break;
        }
      }
    
}


function rollUpActualOneTimeDiscount(quote, lines) {

    let totalOneTime = 0;
	// Create two groups: one for lines with a group and another for groups with a discount.
    const groupsToUpdate = quote.groups.filter(group => group.record.Target_One_time_Discount__c);
    const quoteLinesToUpdate = lines.filter(line => line.parentGroupKey);

	// Create an object to hold the summarized discounts for each group
    let groupDiscounts = quoteLinesToUpdate.reduce((acc, line) => {
        const groupId = line.group.Id;
        const discount = line.record.QCP_One_time_Discount__c;
		acc[groupId] = (acc[groupId] || 0) + discount;
        return acc;
    }, {});

    debug('Groups to Update: ', groupsToUpdate);
    debug('Quote Lines to Update: ', quoteLinesToUpdate);
    debug('Group Discounts: ', groupDiscounts);

	// After summarizing the discounts per group, update the groups target field
	groupsToUpdate.forEach(group => {
        const groupId = group.Id;
        if (groupDiscounts.hasOwnProperty(groupId)) {
            group.record.Actual_One_time_Discount_Applied__c = groupDiscounts[groupId];
            totalOneTime += groupDiscounts[groupId] || 0;
        }
    });
    quote.record.Sum_of_One_time_Discounts__c = totalOneTime;
}

// function rollUpActualOneTimeDiscount(quote, lines, conn) {
//     //Because this runs a query it will require two saves in order to populate the Actual One time Discount Applied (record needs to save)
//     //look at changing this so it runs during calculation sequence.
//
//     const groupsToUpdate = quote.groups.filter(group => group.record.Target_One_time_Discount__c);
//     const quoteId = quote.Id;
//     conn
//         .query('SELECT SUM(Actual_One_time_Discount__c), SBQQ__Group__c ' +
//          "FROM SBQQ__QuoteLine__c WHERE SBQQ__Quote__c = '" +quoteId + "' " +
//          "GROUP BY SBQQ__Group__c"
//         ).then((response) => {
//             response.records.forEach(record => {
//                 debugger;
//                 const aggregateResult = record.expr0;
//                 const groupId = record.SBQQ__Group__c;
//                 groupsToUpdate.forEach(group => {
//                     if(group.Id == groupId) {
//                         group.record.Actual_One_time_Discount_Applied__c = aggregateResult;
//                     }
//                 });
//             });
//         });
// }

function clearSourceOnRenewal(quote) {
    // can't access quote line groups in price actions, require QCP.
    // Clearing the source value during renewal creation

    if (quote.record.SBQQ__Type__c === 'Renewal' && quote.groups.length > 0) {
        const groupsWithSource = quote.groups.filter(group => group.record.SBQQ__Source__c);
        groupsWithSource.forEach(group => {
            group.record.SBQQ__Source__c = null;
        });
    }
}

function clearGroupDiscountOnAmendment(quote) {
    // can't access quote line groups in price actions, require QCP.
    // Clearing the one-time discount for newly created groups on renew/amend
    // Perhaps this should just run regardless if a one-time discount was populated?
    if (quote.record.SBQQ__Type__c != 'Quote' && quote.groups.length > 0) {
        const groupsWithDiscount = quote.groups.filter(group => group.record.Target_One_time_Discount__c && !group.record.One_time_Discount_Removed__c);
        groupsWithDiscount.forEach(group => {
            group.record.Target_One_time_Discount__c = null;
            group.record.Actual_One_time_Discount_Applied__c = null;
            group.record.One_time_Discount_Removed__c = true;
        });
    }
}


function rollUpQuoteValues(quote, lines) {

	// Cannot create roll-up summary field for Revenue_Amount__c, calculate here.
	// adding other fields (Discounts) here as rollup so we don't need to rely on saving record for value / double calculate.
	// To later on be used for comparison against Quote Net Total to ensure revenue fully allocated
	let totalRevenue = 0;
	let totalDiscounts = 0;

	lines.forEach(line => {
		if(line.record.Revenue_Amount__c) {
			totalRevenue += line.record.Revenue_Amount__c;
			totalDiscounts += line.record.QCP_One_time_Discount__c || 0;
		}
	});

	quote.record.Sum_of_Revenue_Amounts__c = totalRevenue;
	//quote.record.Sum_of_One_time_Discounts__c = totalDiscounts;
}

function removeOneTimeDiscount(quote) {

    const groupsWithActualOneTimeDiscount = quote.groups.filter(group => group.record.Actual_One_time_Discount_Applied__c && !group.record.Target_One_time_Discount__c);
    if (groupsWithActualOneTimeDiscount.length > 0) {
        groupsWithActualOneTimeDiscount.forEach(group => {
            group.record.Actual_One_time_Discount_Applied__c = 0;
        });
    }
}

function clearOverride(lines) {

	lines.forEach(line => {
		if(line.record.Override_Revenue_Amount__c) {
			line.record.Override_Revenue_Amount__c = null;
		}
	});
}

function setActualOneTimeDiscount(quote, lines) {

	// relying on formula field here causes some degree of inconsistency so converting to stored value.
    const quoteLinesToUpdate = lines.filter(line => line.record.SBQQ__NetTotal__c && line.record.SBQQ__CustomerTotal__c);
    quoteLinesToUpdate.forEach(line => {
        line.record.QCP_One_time_Discount__c = (line.record.SBQQ__CustomerTotal__c - line.record.SBQQ__NetTotal__c);
    });
}

function setQuoteLineGroupSegment(quote) {
    if (!quote) {
        throw new Error("quote is required");
    }

    const multiYear = quote.groups.filter(group => group.StartDate__c );
    multiYear.sort( compareByStartDate );

    let counter = 1;
    multiYear.forEach(group => {
        group.record.Segment_Order__c = counter;

        // Update group name if it starts with "Group" or "Year"
        const numberRegexGroup = /^Group[0-9]+$/;
        const numberMatchGroup = group.record.Name.match(numberRegexGroup);
        const numberRegexYear = /^Year [0-9]+$/;
        const numberMatchYear = group.record.Name.match(numberRegexYear);
        
        if (numberMatchGroup !== null || numberMatchYear !== null) {
            group.record.Name = 'Year ' + counter;
        }

        group.record.SBQQ__Number__c = counter;
        counter++;
    });

    const nowMultiYear = quote.groups.filter(group => !group.StartDate__c );
    nowMultiYear.forEach(group => {
        group.record.Segment_Order__c = "Non-MY";
        group.record.SBQQ__Number__c = counter;
    });
}

function compareRevenueandNetTotals(quote, lines) {

	// if there is a difference in revenue/net, identify variance
	// identify QL with highst revenue amount, allocate variance to it so net total = revenue total
    // Likely need to create flag to signify once this has run, and only re-evaluate if the net total for a quote changes (set the flag back to false)
    const quoteNetTotal = quote.record.SBQQ__NetAmount__c;
    const quoteRevenueTotal = quote.record.Sum_of_Revenue_Amounts__c;
    const totalDifference = quoteNetTotal - quoteRevenueTotal;

    if(totalDifference !== 0) {
        const quoteLineToUpdate = lines.reduce((max, current) => (max.record.Revenue_Amount__c > current.record.Revenue_Amount__c) ? max : current);

        quoteLineToUpdate.record.Override_Revenue_Amount__c = quoteLineToUpdate.record.Revenue_Amount__c + totalDifference;
    }
}

function setRequiredByDiscount(lines) {

    // Required by isn't accessible through price rules unless save is triggered. See document below
    // https://help.salesforce.com/s/articleView?id=000382714&type=1
    // QCP can access it in memory of QLE
    let discountChanged = false;
    lines.forEach(line => {
        if (!line.record.SBQQ__RequiredBy__r && line.record.SBQQ__Discount__c !== line.record.Prior_Discount_Value__c) {
            line.record.Prior_Discount_Value__c = line.record.SBQQ__Discount__c;
            discountChanged = true;
        }
        if (line.record.SBQQ__RequiredBy__r && discountChanged) {
            if(line.record.SBQQ__RequiredBy__r.SBQQ__Discount__c) {
                line.record.SBQQ__Discount__c = line.record.SBQQ__RequiredBy__r.SBQQ__Discount__c;
            } else {
                line.record.SBQQ__Discount__c = null;
            }

            if(line.record.SBQQ__RequiredBy__r.SBQQ__AdditionalDiscountAmount__c) {
                line.record.SBQQ__AdditionalDiscountAmount__c = line.record.SBQQ__RequiredBy__r.SBQQ__AdditionalDiscountAmount__c;
            } else {
                line.record.SBQQ__AdditionalDiscountAmount__c = null;
            }
        }
    });
}

function clearDiscount(quote, lines) {

    const quoteType = quote.record.SBQQ__Opportunity2__r.Type;
    const newLines = lines.filter(line => !line.record.SBQQ__UpgradedSubscription__c && !line.record.SBQQ__UpgradedAsset__c);

    newLines.forEach(line => {
        const {
            Annual_Minimum__c,
            SBQQ__NetTotal__c,
            SBQQ__ProrateMultiplier__c
        } = line.record;
        if(quoteType == 'New Customer' && Annual_Minimum__c > 0 &&
        ((SBQQ__NetTotal__c / SBQQ__ProrateMultiplier__c) * 12 < Annual_Minimum__c) ) {
            line.record.SBQQ__AdditionalDiscountAmount__c = null;
            line.record.SBQQ__AdditionalDiscount__c = null;
            line.record.SBQQ__Discount__c = null;
        }
    });
}

//function that gets all the quote lines that have an annual minimum
function getAnnualMinimumLines(lines) {
    const annualMinimumLines = lines.filter(line => line.record.Annual_Minimum__c > 0 
                                            && !line.record.SBQQ__UpgradedSubscription__c 
                                            && !line.record.SBQQ__UpgradedAsset__c
                                            && line.record.SBQQ__ProductCode__c != 'PLAT-BYOS-BR');
    return annualMinimumLines;
}

function getAnnualMinimumLinesPlatByosBr(lines) {
    const annualMinimumLines = lines.filter(line => line.record.Annual_Minimum__c > 0 
                                            && !line.record.SBQQ__UpgradedSubscription__c 
                                            && !line.record.SBQQ__UpgradedAsset__c
                                            && line.record.SBQQ__ProductCode__c == 'PLAT-BYOS-BR');
    return annualMinimumLines;
}



function setDiscount(quote, lines) {

    // When products have a Annual minimum, force that value in through the additional discount field.
    // Slight rounding is always possible (just as it is when using the special price Total Override field)
    const quoteType = quote.record.SBQQ__Opportunity2__r.Type;
    const newLines = lines.filter(line => !line.record.SBQQ__UpgradedSubscription__c && !line.record.SBQQ__UpgradedAsset__c);

    newLines.forEach(line => {
        const {
            Annual_Minimum__c,
            SBQQ__NetTotal__c,
            SBQQ__CustomerTotal__c,
            SBQQ__PartnerTotal__c,
            SBQQ__ProrateMultiplier__c,
            SBQQ__ListPrice__c,
            SBQQ__EffectiveSubscriptionTerm__c,
            SBQQ__AdditionalDiscount__c,
            SBQQ__EffectiveQuantity__c
        } = line.record;
        
        if(quoteType == 'New Customer' && Annual_Minimum__c > 0 &&
            ((SBQQ__NetTotal__c / SBQQ__ProrateMultiplier__c) * 12) < Annual_Minimum__c ) {

            // amount based
            let preDiscountAmount = 0;
            //if(line.group.record.SBQQ__AdditionalDiscountRate__c || line.group.record.SBQQ__AdditionalDiscountRate__c === 0) {
            //  preDiscountAmount = SBQQ__ListPrice__c * SBQQ__EffectiveQuantity__c * 12 * (1 - (line.group.record.SBQQ__AdditionalDiscountRate__c/100));
            //} else {
            //  preDiscountAmount = SBQQ__ListPrice__c * SBQQ__EffectiveQuantity__c * 12;
            //}
            preDiscountAmount = SBQQ__ListPrice__c * SBQQ__EffectiveQuantity__c * 12;
            let x = ((Annual_Minimum__c - preDiscountAmount) / preDiscountAmount) * SBQQ__ListPrice__c * SBQQ__ProrateMultiplier__c * -1;
            line.record.SBQQ__AdditionalDiscountAmount__c = x;
            line.record.SBQQ__Discount__c = null;
            //line.record.Minimum_Amount_Enforced__c = true;

            // Can do it using discount %, but leads to more significant rounding differences. Should use amount (as above)
            // let preDiscountAmount = SBQQ__ListPrice__c * SBQQ__EffectiveQuantity__c * 12;
            // let x = ((Annual_Minimum__c - preDiscountAmount) / preDiscountAmount) * -1;
            // line.record.SBQQ__Discount__c = x;
        } /*else {
            line.record.Minimum_Amount_Enforced__c = false;
        }*/

    });
}

function checkMinimumAmount(quote, lines) {

    // When products have a Annual minimum, force that value in through the additional discount field.
    // Slight rounding is always possible (just as it is when using the special price Total Override field)
    const quoteType = quote.record.SBQQ__Opportunity2__r.Type;
    const newLines = getAnnualMinimumLines(lines);

    newLines.forEach(line => {
        const {
            Annual_Minimum__c,
            SBQQ__NetTotal__c,
            SBQQ__RegularTotal__c,
            SBQQ__RegularPrice__c,
            SBQQ__CustomerTotal__c,
            SBQQ__PartnerTotal__c,
            SBQQ__ProrateMultiplier__c,
            SBQQ__ListPrice__c,
            SBQQ__EffectiveSubscriptionTerm__c,
            SBQQ__AdditionalDiscount__c,
            SBQQ__EffectiveQuantity__c
        } = line.record;

        line.record.Failed_Minimum_Amount__c = false;
        if(quoteType == 'New Customer' && Annual_Minimum__c > 0 &&
            ((SBQQ__NetTotal__c / SBQQ__ProrateMultiplier__c) * 12) < Annual_Minimum__c ) {

            line.record.Failed_Minimum_Amount__c = true;
        }

    });
}

function checkMinimumAmountPlatByosBr(quote, lines) {
    
    //get all the lines where the product code is PLAT-BYOS-BR
    debugger;
    const quoteType = quote.record.SBQQ__Opportunity2__r.Type;
    const platByosBrLines = getAnnualMinimumLinesPlatByosBr(lines);
    platByosBrLines.forEach(platByosBrLine => {
        platByosBrLine.record.Failed_Minimum_Amount__c = false;
        let minimumAmount = platByosBrLine.record.Annual_Minimum__c;
        let calculatedARR = (platByosBrLine.record.SBQQ__NetTotal__c / platByosBrLine.record.SBQQ__ProrateMultiplier__c) * 12;
        let srvPremSupLine = lines.filter(component => 
            component.record.SBQQ__ProductCode__c == 'SRV-PREM-SUP' && 
            component.parentItemKey == platByosBrLine.parentItemKey);
        if (srvPremSupLine.length > 0){
            srvPremSupLine[0].record.Failed_Minimum_Amount__c = false;
            calculatedARR += (srvPremSupLine[0].record.SBQQ__NetTotal__c / srvPremSupLine[0].record.SBQQ__ProrateMultiplier__c);
        }
        if(calculatedARR < minimumAmount && quoteType == 'New Customer'){
            platByosBrLine.record.Failed_Minimum_Amount__c = true;
            if (srvPremSupLine.length > 0){
                srvPremSupLine[0].record.Failed_Minimum_Amount__c = true;
            }
        }

    });
}



//PLAT-BYOS-BR
//SRV-PREM-SUP

//Function that returns an array of the sum of the customer total for each group and the index is the group id
function getGroupCustomerTotal(lines){
    let groupCustomerTotal = [];
    lines.forEach(line => {
        if(line.parentGroupKey){
            if(groupCustomerTotal[line.parentGroupKey]){
                groupCustomerTotal[line.parentGroupKey] += line.record.SBQQ__CustomerTotal__c;
            } else {
                groupCustomerTotal[line.parentGroupKey] = line.record.SBQQ__CustomerTotal__c;
            }
        }
    });
    return groupCustomerTotal;
}


function setTargetOneTimeAmount(quote, lines) {
    if (quote.groups.length > 0){
        //debugger;
        const oneTimeDiscountLines = lines.filter(line => line.record.SBQQ__CustomerTotal__c !== 0 
                                            && line.record.SBQQ__ProductFamily__c !== 'Services');

        
        const groupCustomerTotals = getGroupCustomerTotal(oneTimeDiscountLines);

        // Calculate the one-time discount to be applied from the Quote Line Group to the Quote Lines within it. 
        // Distributor (or partner) discount only accepts % values, not $ values. Can lead to slight rounding discrepencies.
        // Any variance is captured in the "Actual One-time Discount Applied"
        oneTimeDiscountLines.forEach(line => {
            const { 
                SBQQ__Group__r: { Target_One_time_Discount__c },
                Distribution_Group__c,
                SBQQ__CustomerTotal__c,
                SBQQ__EffectiveQuantity__c,
                SBQQ__CustomerPrice__c,
                SBQQ__Group__c
            } = line.record;

            if(Target_One_time_Discount__c === null) {
                line.record.SBQQ__DistributorDiscount__c = null;
            } else { 
                const groupCustomerTotal = groupCustomerTotals[line.parentGroupKey];
                const distributionDiscount = SBQQ__CustomerTotal__c / groupCustomerTotal;
                //const lineCalculatedAmount = Target_One_time_Discount__c * (distributionDiscount / 100);
                const lineCalculatedAmount = Target_One_time_Discount__c * (distributionDiscount);
                const calculatedLineDistributorTotal = SBQQ__CustomerTotal__c - lineCalculatedAmount;
                const newCalculatedDistributorUnitPrice = calculatedLineDistributorTotal / SBQQ__EffectiveQuantity__c;
                const distributorDiscountToApply = (((newCalculatedDistributorUnitPrice - SBQQ__CustomerPrice__c) / SBQQ__CustomerPrice__c) * 100);

                line.record.SBQQ__DistributorDiscount__c = distributorDiscountToApply ? -distributorDiscountToApply : null;
            }
        });
    }
}

function clearValidation(quote) {

    quote.record['Group_Date_Validation__c'] = false;
}

// The purpose of this function is to throw validation errors when incorrect dates are used within groups.
function sortAndValidateGroupDates(quote) {
    
	let calculatedGroups = quote.groups.filter(group => !group.record.Do_Not_Calculate_Dates__c && quote.record.SBQQ__Type__c != 'Amendment');
	
	if (calculatedGroups.length > 0) {
        
		calculatedGroups.sort(compareByStartDate);
        // might need a null check for startdate__c. 
        // #1 The earliest group start date must match the quote start date
        let firstIndexStart = calculatedGroups[0].StartDate__c.toISOString().substring(0, 10);
        if (quote.record['SBQQ__StartDate__c'] !== firstIndexStart) {
            quote.record['Group_Date_Validation__c'] = true;
        }
        let dateStore;
        // #2 There should not be a gap > 1 day when comparing the current group start date and previous group end date
        // first iteration will have no 'dateStore' value which is OK as no previous group to compare against, just quote header.
        calculatedGroups.some((group, index) => {
            //if (index === 0) return false;
            let dateDiff = dateDiffInDays(new Date(dateStore), new Date(group.record.SBQQ__StartDate__c));
            if (Math.abs(dateDiff) > 1) {
                quote.record['Group_Date_Validation__c'] = true;
                return true;
            }
            dateStore = group.record.SBQQ__EndDate__c;
        });
    }
}

// This function auto-fills the quote line group Start Date based on the latest end date. 
function setGroupDates(quote){
	if(quote.groups.length > 0 && quote.record.SBQQ__Type__c != 'Amendment'){
		//Automatically assign the quote start date for the first group if it has not been set
		if(quote.groups.length == 1 && quote.record.SBQQ__StartDate__c){
			// Check if term is populated already, let users populate the value.
			if(!quote.groups[0].record.Do_Not_Calculate_Dates__c){	
				quote.groups[0].record.SBQQ__StartDate__c = quote.record.SBQQ__StartDate__c;
				if(quote.groups[0].record.SBQQ__SubscriptionTerm__c) {
					quote.groups[0].record.SBQQ__EndDate__c = quote.groups[0].calculatedEndDate.toISOString().substring(0, 10);
				} else if (!quote.groups[0].record.SBQQ__EndDate__c) {
					quote.groups[0].record.SBQQ__SubscriptionTerm__c = 12;
					quote.groups[0].record.SBQQ__EndDate__c = quote.groups[0].calculatedEndDate.toISOString().substring(0, 10);
				}
			}
		}
		//Handle Cloned groups
		//Get the last key
		let highestKeyQuoteLine = quote.groups.find(function(group) {
			return group.key === Math.max.apply(Math, quote.groups.map(function(group) { return group.key; }));
		});

		//Search for one group with the same name and/or Start Date
		let clonedFromQuoteLines = quote.groups.filter(group => group.record.SBQQ__StartDate__c == highestKeyQuoteLine.record.SBQQ__StartDate__c && group.key != highestKeyQuoteLine.key);
		if(clonedFromQuoteLines.length > 0){
			highestKeyQuoteLine.record.SBQQ__StartDate__c = null;
			highestKeyQuoteLine.record.SBQQ__EndDate__c = null;
			// insert new line to clear term
			highestKeyQuoteLine.record.SBQQ__SubscriptionTerm__c = null;
		}

		// Find the groups where are part of a multi-year deal that have an end date and find the last end date
		let groupsWithEndDate = quote.groups.filter(group => group.record.SBQQ__EndDate__c && group.record.SBQQ__StartDate__c && !(group.record.Do_Not_Calculate_Dates__c));
		if (groupsWithEndDate.length > 0){
			groupsWithEndDate.sort(compareByStartDate);
			let nextStartDate = groupsWithEndDate[groupsWithEndDate.length - 1].EndDate__c;
			nextStartDate.setDate(nextStartDate.getDate() + 1);
			let nextStartDateInString = nextStartDate.toISOString().substring(0, 10);
			let groupsWithoutStartDate = quote.groups.filter(group => !(group.record.SBQQ__StartDate__c) && !(group.record.Do_Not_Calculate_Dates__c));
			groupsWithoutStartDate.forEach(group => {
				group.record.SBQQ__StartDate__c = nextStartDateInString;
			});
		}

		//Automatically assign the subscription term and default it to 12
		let groupsWithoutTerm = quote.groups.filter(group => 
			!(group.record.Do_Not_Calculate_Dates__c) &&
			group.record.SBQQ__StartDate__c &&
			!(group.record.SBQQ__SubscriptionTerm__c) &&
			!(group.record.SBQQ__EndDate__c)
		)
		groupsWithoutTerm.forEach(group => {
			group.record.SBQQ__SubscriptionTerm__c = 12; 
		});

		//Automatically calculate end date based on the term
		let groupsWithTerm = quote.groups.filter(group =>
			!(group.record.Do_Not_Calculate_Dates__c) &&
			group.record.SBQQ__StartDate__c &&
			group.record.SBQQ__SubscriptionTerm__c //&&
			//!(group.record.SBQQ__EndDate__c)
		)
		groupsWithTerm.forEach(group => {
			group.record.SBQQ__EndDate__c = group.calculatedEndDate.toISOString().substring(0, 10);
		});
	}
}

function compareByStartDate( a, b ) {

	if ( a.StartDate__c < b.StartDate__c ){
	  return -1;
	}
	if ( a.StartDate__c > b.StartDate__c ){
	  return 1;
	}
	return 0;
}

function dateDiffInDays(a, b) {

    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

//Function that finds the minimun quantity for the quote
function findMinimumQuantity(lines){
    return getQuoteMinimumQuantity(lines)
}

function getQuoteMinimumQuantity(lines){
    let minimumUsers = null;
    let quoteLines = lines.filter(line => line.record.Minimum_Users__c && 
                                                line.record.Minimum_Users__c > 0);
    if(quoteLines){
        minimumUsers = quoteLines.reduce((min, line) => {
                            const minimumUsers = line.record.Minimum_Users__c;
                            return minimumUsers < min ? minimumUsers : min;
                        }, Infinity);
    }
    console.log('minimumUsers:' + minimumUsers);
    return minimumUsers;
}

//Function that handles the License Type cascading feature
function cascadeLicenseType(quote, lines){
    
    //Get all bundle lines and loop through it to set the License Type
    let bundleLines = lines.filter( line => line.components.length > 0);
    bundleLines.forEach(bundle => {
        //Cascade the License Type from bundle to the component
        bundle.components.forEach(component => {
            if(isLicenseTypeCascadeEligible(component)){
                component.record.LicenseType__c = bundle.record.LicenseType__c;
            } else if(component.record.Override_License_Type__c){
                component.record.LicenseType__c = component.record.Override_License_Type__c;
            }
            
        });
    });

}

//Function that determines if the line is eligible to have the License Type cascaded 
function isLicenseTypeCascadeEligible (line){
    return !(isCurrentSubscription(line) || line.record.Exclude_License_Type_Cascade__c || line.record.Override_License_Type__c);
}

function cascadeAdditionalDiscount(quote, lines){
    quote.groups.forEach(group => {
        if(group.record.SBQQ__TargetCustomerAmount__c){
            group.record.SBQQ__AdditionalDiscountRate__c = null;
        }
        if(group.record.SBQQ__AdditionalDiscountRate__c != group.record.Prior_Discount_Percentage__c){
            group.lineItems.forEach(line => {
                if(isAdditionalDiscountEligible(line)){
                    line.record.SBQQ__Discount__c = group.record.SBQQ__AdditionalDiscountRate__c;
                    if(line.record.SBQQ__ProductFamily__c == 'Services' &&  group.record.SBQQ__AdditionalDiscountRate__c != null)
                        line.record.SBQQ__Discount__c = 0;

                }
            });
            group.record.Prior_Discount_Percentage__c = group.record.SBQQ__AdditionalDiscountRate__c;
        }
    });
}

function isAdditionalDiscountEligible(line){
    return (!(isCurrentSubscription (line)) 
            //&& (line.record.SBQQ__SubscriptionPricing__c != 'Percent Of Total'));
        );
}

function cascadeTargetCustomerAmount(quote, lines){
    return 0;
}

//Function that tests if the line is coming from subscription (on amendments) or it is a new line
function isCurrentSubscription (line){
    return line.record.SBQQ__UpgradedSubscription__c || line.record.SBQQ__UpgradedAsset__c
}

function resetTargetCustomerAmount(quote, lines){
    quote.groups.forEach(group => {

        if( !(group.record.SBQQ__TargetCustomerAmount__c) && group.record.Prior_Target_Customer_Amount__c != group.record.SBQQ__TargetCustomerAmount__c && quote.record.SBQQ__Type__c != 'Amendment'){
            group.lineItems.forEach(line => {
                line.record.SBQQ__AdditionalDiscountAmount__c = null;
            })
        }
        group.record.Prior_Target_Customer_Amount__c = group.record.SBQQ__TargetCustomerAmount__c;

    });
}

//function that loops the quote lines and calculate the line MRR for each one of them.
function calculateLinesMRR (quote, lines){

    if(isQuoteClosedForCalculation(quote)) return false;
    let mrrLines = getMRRLines(lines);
    mrrLines.forEach(line => {
        if(isLineMRREligible(line)){
            line.record.MRR_CPQ__c = calculateLineMRR(line);
            line.record.ARR_CPQ__c = line.record.MRR_CPQ__c * 12;
            line.record.Services_CPQ__c = 0;
        }
    });
    let serviceLines = getServiceLines(lines);
    serviceLines.forEach(line => {
        if(isLineMRREligible(line)){
            line.record.MRR_CPQ__c = 0;
            line.record.ARR_CPQ__c = 0;
            line.record.Services_CPQ__c = line.record.SBQQ__NetTotal__c;
        }
    });
}

function isLineMRREligible(line){
    return true;
}

//Function that will return true if it calculate MMR is allowed
function isQuoteClosedForCalculation(quote){
    console.log('Test');
    return false;
}
//Function that calculates the MRR for each recurrent line
function calculateLineMRR(line){
    let lineMRR = 0;
    if( line.record.SBQQ__DefaultSubscriptionTerm__c == 1){
        lineMRR = line.record.SBQQ__NetTotal__c / line.record.SBQQ__ProrateMultiplier__c;
    } else {
        lineMRR = line.record.SBQQ__NetTotal__c / line.record.SBQQ__ProrateMultiplier__c / line.record.SBQQ__DefaultSubscriptionTerm__c;
    }
    return lineMRR;
}

function isServiceLine(line){
    return line.record.SBQQ__ProductFamily__c == 'Services';
}

//Function that will return all service lines
function getServiceLines(lines){
    return lines.filter(line => (line.record.SBQQ__ProductFamily__c == 'Services' && line.record.One_Time_Services__c) || !(line.record.SBQQ__SubscriptionPricing__c));
}

//function that will return all MRR lines
function getMRRLines(lines){

    return lines.filter(line => ((line.record.SBQQ__ProductFamily__c != 'Services') || 
                                    (line.record.SBQQ__ProductFamily__c == 'Services' && line.record.One_Time_Services__c == false))
                                && line.record.SBQQ__SubscriptionPricing__c);
}

function setQuoteLineYear(quote, lines){
    if(quote.groups.length > 0){
        lines.forEach(line => {
            let segment = line.Group__r.Segment_Order__c;
            let billingSchedule = quote.record.Billing_Schedule__c;
            line.record.Year__c =  calculateYear(segment, billingSchedule);
        });
    }
}

function calculateYear(segment, billingSchedule) {
    const segmentPerYear = {
      "Annual" : 1,
      "Semi Annual" : 2,
      "Quarterly" : 4
    };
    const segmentsPerYear = segmentPerYear[billingSchedule];
    const year = Math.floor((segment - 1) / segmentsPerYear) + 1;
    return year;
  }

//Function that rollup MRR, ARR and Services for the first year (lines where year = 1) 
//into the quote
function rollupQuoteMRR (quote, lines){
    if(isQuoteClosedForCalculation(quote)) return false;
    resetFirstYearCPQ(quote, lines)
    let mrrLines = getSubscriptionQuoteLinesToRollup(quote, lines);
    let mrr = 0;
    let arr = 0;
    mrrLines.forEach(line => {
        mrr += line.record.MRR_CPQ__c;
        arr += line.record.ARR_CPQ__c;
        line.record.First_Year_CPQ__c = true;
    });
    quote.record.MRR_CPQ__c = mrr;
    quote.record.ARR_CPQ__c = arr;

    let serviceLines = getServiceLines(lines);
    let services = 0;
    let servicesFirstYear = 0;
    serviceLines.forEach(line => {
        services += line.record.Services_CPQ__c;
        if(line.record.Year__c == getFirstYearWithChange(quote, lines)){
            servicesFirstYear += line.record.Services_CPQ__c;
            line.record.First_Year_CPQ__c = true;
        }
    });
    quote.record.Services_CPQ__c = services;
    quote.record.Services_First_Year_CPQ__c = servicesFirstYear;
}

//Function that gets the first year with a change in an amendment quote
function getFirstYearWithChange(quote, lines){
    if(quote.record.SBQQ__Type__c != 'Amendment') return 1;

    let quoteLines = lines.filter(line => line.record.SBQQ__Quantity__c != line.record.SBQQ__PriorQuantity__c);
    let minYear = Math.min(...quoteLines.map(line => line.record.Year__c));
    return minYear ? minYear : 1;
}

//Function that will reset the First Year CPQ field on the quote lines
function resetFirstYearCPQ(quote, lines){
    lines.forEach(line => {
        line.record.First_Year_CPQ__c = false;
    });
}


//Function that gets the subscription quote lines where the quote start date is between the line effective start date and effective end date
function getSubscriptionQuoteLinesToRollup(quote, lines){
    let quoteStartDate = quote.record.SBQQ__StartDate__c;
    let recurringLines = getMRRLines(lines);
    let quoteLines = recurringLines.filter(line => quoteStartDate >= convertDateToString(line.effectiveStartDate) 
                                                   && quoteStartDate <= convertDateToString(line.effectiveEndDate));
    
    return quoteLines;
}

//Function that gets the service lines to rollup into the quote
function getServiceQuoteLinesToRollup(quote, lines){
    return lines.filter(line => !line.record.SBQQ__SubscriptionPricing__c);
}

//Function that converts a date to a string in the format YYYY-MM-DD with zero padding
function convertDateToString(date){
    if(!date) return '2050-12-31';
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let dateString = date.getFullYear() + "-" + (month < 10 ? "0" + month : month) + "-" + (day < 10 ? "0" + day: day);
    return dateString;
}





//Function that controls when a field is read only in the QLE
export function isFieldEditableForObject(fieldName, quoteOrLine, conn, objectName) {

    if (objectName === 'QuoteLine__c' && (fieldName === 'Override_License_Type__c' || fieldName === 'LicenseType__c') ){
        return !(quoteOrLine.SBQQ__UpgradedSubscription__c || quoteOrLine.SBQQ__UpgradedAsset__c || quoteOrLine.Exclude_License_Type_Cascade__c);
    }
    if (objectName === 'Quote__c' && (fieldName == 'MRR_CPQ__c' || fieldName == 'ARR_CPQ__c' || fieldName == 'Services_CPQ__c')) {
        return false;
    }
    /*
    if (fieldName == 'SBQQ__TargetCustomerAmount__c') {
        if(quoteOrLine.SBQQ__Type__c == 'Amendment') return false;
    }

    if (fieldName == 'SBQQ__AdditionalDiscountRate__c') {
        if(quoteOrLine.SBQQ__Type__c == 'Amendment') return false;
    }*/




	/*if (objectName === 'QuoteLine__c' && fieldName === 'Revenue_Metric__c') {
		let quoteType = quoteOrLine.SBQQ__Quote__r.SBQQ__Type__c;
		let editRevenueMetricOnAmendments = quoteOrLine.Edit_Revenue_Metric__c;
		if ((quoteOrLine.SBQQ__RenewedSubscription__c != null && quoteType == 'Renewal') || 
			quoteType == 'Quote' ||
			(!editRevenueMetricOnAmendments && quoteOrLine.SBQQ__UpgradedSubscription__c)) {
			return false;
		}
	}
	if (objectName === 'QuoteLine__c' && fieldName === 'UpliftPercentage1__c') {
		if (!quoteOrLine.SBQQ__RenewedSubscription__c) {
			return false;
		}
	}
	let fieldsReadOnly = ['ARR_QCP__c', 'Commissionable_ARR__c', 'Effective_Discount__c', 'Industry_Filter__c', 'SBQQ__SpecialPrice__c', 'SBQQ__PriorQuantity__c'];
	if (fieldsReadOnly.includes(fieldName)) {
         return false;
    }

	if (objectName === 'QuoteLine__c' && fieldName === 'Commissionable_ARR_Override__c'){
		if ((!quoteOrLine.Calculate_New_ARR_Override__c)) {
			return false;
		}
	}

	if (objectName === 'QuoteLine__c' && fieldName === 'Final_Year_ARR_Override__c'){
		if ((!quoteOrLine.Calculate_New_Final_ARR_Override__c)) {
			return false;
		}
	}

	if (objectName === 'QuoteLine__c' && 
		(fieldName === 'Calculate_New_ARR_Override__c' || 
		fieldName === 'Calculate_New_Final_ARR_Override__c' ||
		fieldName === 'Commissionable_ARR_Override__c' ||
		fieldName === 'Final_Year_ARR_Override__c' ||
		fieldName === 'First_Year_ARR_Override__c' )){
		if (!quoteOrLine.Edit_ARR_Override__c) {
			return false;
		}
	}*/
}