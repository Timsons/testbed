# Delete a suite removes the suite and its case links but keeps the test cases

## Preconditions

A suite exists with two linked test cases, A and B.

## Steps

1. Send a delete-suite request for the suite.
2. Read the response.
3. Fetch the list of suites.
4. Fetch test case A and test case B directly.

## Expected Result

The API returns success. The suite no longer appears in the suite list and its case links are gone. Test cases A and B still exist and are unaffected.

## Severity

Critical

## Status

Draft
