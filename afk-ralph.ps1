param(
    [Parameter(Mandatory)]
    [int]$Iterations
)

for ($i = 1; $i -le $Iterations; $i++) {
    $result = docker sandbox run claude --permission-mode acceptEdits -p "@PRD.md @progress.txt 1. Find the highest-priority task and implement it. 2. Run your tests and type checks. 3. Update the PRD with what was done. 4. Append your progress to progress.txt. 5. Commit your changes. ONLY WORK ON A SINGLE TASK. If the PRD is complete, output <promise>COMPLETE</promise>."

    Write-Output $result

    if ($result -like "*<promise>COMPLETE</promise>*") {
        Write-Output "PRD complete after $i iterations."
        exit 0
    }
}
