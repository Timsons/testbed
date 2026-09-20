# Remove a linked test case from a suite succeeds

## Preconditions

A suite exists with two linked test cases, A and B.

## Steps

1. Send a remove-case request to the suite with the id of test case A.
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns success. Test case A is no longer linked to the suite. Test case B remains linked. The underlying test case A record still exists and is not deleted.

## Severity

Major

## Status

Draft
