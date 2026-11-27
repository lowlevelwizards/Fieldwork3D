"""Cancel only superseded, same-repository pull_request workflow runs.
No production, push, manual, fork, closed-PR, or current-head run is eligible.
Defaults to a dry run; --apply is required for cancellation.
"""
import argparse
import json
import os
import urllib.request
import urllib.parse
import urllib.error

ACTIVE = ("queued", "pending", "in_progress", "requested", "waiting")

def eligible(run, pull, repo):
    head = pull.get("head") or {}
    return (
        pull.get("state") == "open"
        and (head.get("repo") or {}).get("full_name", "").lower() == repo.lower()
        and run.get("event") == "pull_request"
        and run.get("status") in ACTIVE
        and (run.get("head_repository") or {}).get("full_name", "").lower() == repo.lower()
        and run.get("head_branch") == head.get("ref")
        and run.get("head_branch") not in ("main", "master")
        and bool(run.get("head_sha")) and bool(head.get("sha"))
        and run["head_sha"] != head["sha"]
        and (run.get("path") or "").split("@")[0] not in (
            ".github/workflows/pages.yml", ".github/workflows/queue-recovery.yml"
        )
    )

class API:
    def __init__(self, repo, token):
        self.base = os.environ.get("GITHUB_API_URL", "https://api.github.com") + "/repos/" + repo
        self.token = token

    def request(self, path, method="GET"):
        req = urllib.request.Request(self.base + path, method=method, headers={
            "Authorization": "Bearer " + self.token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "fieldwork-queue-recovery",
        })
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read()
            return json.loads(raw) if raw else None

    def pages(self, path, key=None):
        for page in range(1, 101):
            separator = "&" if "?" in path else "?"
            result = self.request(path + separator + urllib.parse.urlencode({"per_page": 100, "page": page}))
            rows = result[key] if key else result
            yield from rows
            if len(rows) < 100:
                return
        raise RuntimeError("Pagination safety limit reached")

def sweep(api, repo, apply=False):
    pulls = {}
    for pull in api.pages("/pulls?state=open"):
        head = pull.get("head") or {}
        if (head.get("repo") or {}).get("full_name", "").lower() == repo.lower():
            pulls.setdefault(head.get("ref"), []).append(pull)
    runs = {}
    for status in ACTIVE:
        for run in api.pages("/actions/runs?event=pull_request&status=" + status, "workflow_runs"):
            runs[run["id"]] = run
    candidates = []
    for run in runs.values():
        matches = pulls.get(run.get("head_branch"), [])
        # Multiple open PRs using the same branch are ambiguous; leave untouched.
        if len(matches) == 1 and eligible(run, matches[0], repo):
            candidates.append((run, matches[0]["number"]))
    cancelled = 0
    errors = []
    for run, number in sorted(candidates, key=lambda x: x[0]["id"]):
        print(f"{'CANCEL' if apply else 'WOULD CANCEL'} PR #{number} {run['id']} {run.get('name')} {run['head_sha'][:12]}", flush=True)
        if not apply:
            continue
        # Re-read live PR and run to protect against concurrent pushes or state changes.
        live_pull = api.request(f"/pulls/{number}")
        live_run = api.request(f"/actions/runs/{run['id']}")
        if not eligible(live_run, live_pull, repo):
            continue
        try:
            api.request(f"/actions/runs/{run['id']}/cancel", "POST")
            cancelled += 1
        except urllib.error.HTTPError as error:
            if error.code == 409:
                print(f"Run {run['id']} no longer cancellable; leaving it alone.")
            else:
                errors.append((run["id"], error.code))
    print(json.dumps({"active_pr_runs": len(runs), "candidates": len(candidates), "cancel_requested": cancelled, "apply": apply, "errors": errors}))
    if errors:
        raise RuntimeError("One or more cancellations failed")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not args.repo or not token:
        parser.error("repository and GH_TOKEN or GITHUB_TOKEN are required")
    sweep(API(args.repo, token), args.repo, args.apply)

if __name__ == "__main__":
    main()
