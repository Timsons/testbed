# Reorder suite cases with the same set of ids in a new order succeeds

## Preconditions

A suite exists with three linked test cases, A, B, C, currently ordered A, B, C.

## Steps

1. Send a reorder request to the suite with the id list [C, A, B].
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns success. The suite's cases are now ordered C, A, B, with sort_order values reflecting that new order.

## Severity

Major

## Status

Draft
