# Reorder request containing an unknown case id is rejected with no partial update

## Preconditions

A suite exists with two linked test cases, A and B, currently ordered A, B. Test case Z exists but is not linked to this suite.

## Steps

1. Send a reorder request to the suite with the id list [A, B, Z].
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns an error because Z is not part of the suite's current set of linked ids. The suite's order remains A, B, unchanged; no partial reorder is applied.

## Severity

Major

## Status

Draft
