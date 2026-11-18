# D3.30H — deliberate, atomic squad-wide entry resumption

Built on the D3.30A–G feature branch as an independent stacked stage. The group option appears only when two or more living operators have *historically witnessed* generated entry interruptions for the same physical door ID. It never observes live lock state to decide visibility. Solo RESUME ENTRY remains available.

A single deliberate RESUME SQUAD command checks every participant with the existing authoritative individual retry rules. It then restores their precise saved nodes with fresh IDs, ahead of unrelated orders, through `atomicTeamEdit`. The transaction either commits all participants with shared undo/redo or changes nothing, including the saved incidents. It clears the stored snapshots only after success. Movement still runs through the ordinary full-body motor; no automated breach, implicit crossing, or hidden-intel route is added.

This branch remains unmerged until D3.30A–G passes its own production release checkpoint and Pages serves that release. Focused tests cover group eligibility, one-member refusal, atomic commit, shared undo/redo and palette command authority.
