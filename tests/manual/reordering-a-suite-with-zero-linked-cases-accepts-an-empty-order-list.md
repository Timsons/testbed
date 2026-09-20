# Reordering a suite with zero linked cases accepts an empty order list

## Preconditions

A suite exists with no linked test cases.

## Steps

1. Send a reorder request to the suite with an empty id list [].
2. Read the response.

## Expected Result

The API returns success. The empty submitted set matches the suite's current empty set of linked cases, and the suite remains with zero linked cases.

## Severity

Minor

## Status

Draft
