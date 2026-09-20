# Reorder request containing a duplicated case id is rejected

## Preconditions

A suite exists with two linked test cases, A and B, currently ordered A, B.

## Steps

1. Send a reorder request to the suite with the id list [A, A] (id A repeated, id B omitted).
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns an error. The repeated id means the submitted list does not exactly match the suite's current set of linked ids (id B is missing). The suite's order remains A, B, unchanged.

## Severity

Major

## Status

Draft
