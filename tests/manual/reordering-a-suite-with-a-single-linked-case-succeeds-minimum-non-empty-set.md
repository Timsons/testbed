# Reordering a suite with a single linked case succeeds (minimum non-empty set)

## Preconditions

A suite exists with exactly one linked test case, A.

## Steps

1. Send a reorder request to the suite with the id list [A].
2. Read the response.

## Expected Result

The API returns success. The suite still has test case A linked, at sort_order 0.

## Severity

Minor

## Status

Draft
