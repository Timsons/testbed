# Reorder request missing one of the suite's current case ids is rejected with no partial update

## Preconditions

A suite exists with three linked test cases, A, B, C, currently ordered A, B, C.

## Steps

1. Send a reorder request to the suite with the id list [B, C] (id A omitted).
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns an error because the submitted set of ids does not exactly match the suite's current set of linked ids. The suite's order remains A, B, C, unchanged; no partial reorder is applied.

## Severity

Major

## Status

Draft
