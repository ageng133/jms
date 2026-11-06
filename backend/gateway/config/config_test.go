package config

import (
	"os"
	"path/filepath"
	"testing"
)

// chdirTemp moves into a fresh temp dir (with a child dir) for the test and
// returns the child path. LoadConfig reads .env relative to the working dir.
func chdirTemp(t *testing.T) (parent, child string) {
	t.Helper()
	parent = t.TempDir()
	child = filepath.Join(parent, "gateway")
	if err := os.Mkdir(child, 0o755); err != nil {
		t.Fatal(err)
	}
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(child); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(wd) })
	return parent, child
}

func writeEnv(t *testing.T, dir, content string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestLoadConfig_RealEnvBeatsDotEnv(t *testing.T) {
	parent, _ := chdirTemp(t)
	writeEnv(t, parent, "POSTGRES_PORT=5432\n")
	t.Setenv("POSTGRES_PORT", "5434")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Postgres.Port != "5434" {
		t.Fatalf("POSTGRES_PORT = %q, want the shell value 5434 to win over .env", cfg.Postgres.Port)
	}
}

func TestLoadConfig_NearestDotEnvWins(t *testing.T) {
	parent, child := chdirTemp(t)
	writeEnv(t, parent, "POSTGRES_PORT=1111\n")
	writeEnv(t, child, "POSTGRES_PORT=2222\n")
	// t.Setenv registers cleanup; unset so only the .env files decide.
	t.Setenv("POSTGRES_PORT", "")
	os.Unsetenv("POSTGRES_PORT")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Postgres.Port != "2222" {
		t.Fatalf("POSTGRES_PORT = %q, want 2222 from the nearest .env", cfg.Postgres.Port)
	}
}

func TestLoadConfig_ParentDotEnvIsRead(t *testing.T) {
	parent, _ := chdirTemp(t)
	writeEnv(t, parent, "POSTGRES_PORT=3333\n")
	t.Setenv("POSTGRES_PORT", "")
	os.Unsetenv("POSTGRES_PORT")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Postgres.Port != "3333" {
		t.Fatalf("POSTGRES_PORT = %q, want 3333 from ../.env", cfg.Postgres.Port)
	}
}
