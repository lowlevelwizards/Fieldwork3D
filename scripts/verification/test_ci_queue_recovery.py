import unittest
from ci_queue_recovery import eligible, sweep

REPO = "lowlevelwizards/Fieldwork3D"
def pull(**head):
    return {"state": "open", "number": 42, "head": {"ref": "art/pack", "sha": "new", "repo": {"full_name": REPO}, **head}}

def run(**kw):
    return {"id": 9, "event": "pull_request", "status": "queued", "head_repository": {"full_name": REPO}, "head_branch": "art/pack", "head_sha": "old", "path": ".github/workflows/check.yml", **kw}

class Safety(unittest.TestCase):
    def test_only_stale_same_repo_pr(self):
        self.assertTrue(eligible(run(), pull(), REPO))
        for mutation in ({"head_sha": "new"}, {"event": "push"}, {"event": "workflow_dispatch"}, {"status": "completed"}, {"head_branch": "main"}, {"head_repository": {"full_name": "fork/Fieldwork3D"}}, {"path": ".github/workflows/pages.yml"}, {"path": ".github/workflows/queue-recovery.yml"}, {"head_sha": ""}):
            self.assertFalse(eligible(run(**mutation), pull(), REPO), mutation)
        self.assertFalse(eligible(run(), {**pull(), "state": "closed"}, REPO))
        self.assertFalse(eligible(run(), pull(repo={"full_name":"fork/Fieldwork3D"}), REPO))

    def test_dry_run_and_recheck(self):
        class Fake:
            def __init__(self, current):
                self.current = current
                self.writes = []
            def pages(self, path, key=None):
                if path.startswith("/pulls"):
                    return [pull()]
                return [run()] if "status=queued" in path else []
            def request(self, path, method="GET"):
                if method == "POST":
                    self.writes.append(path)
                elif path.startswith("/pulls"):
                    return pull(sha=self.current)
                else:
                    return run()
        fake = Fake("new")
        sweep(fake, REPO)
        self.assertEqual(fake.writes, [])
        sweep(fake, REPO, True)
        self.assertEqual(fake.writes, ["/actions/runs/9/cancel"])
        fake = Fake("old")
        sweep(fake, REPO, True)
        self.assertEqual(fake.writes, [])

if __name__ == "__main__":
    unittest.main()
