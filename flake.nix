{
  description = "Rigor documentation site";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];

      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          nodejs = pkgs.nodejs_24 or pkgs.nodejs_22;
        in
        {
          default = pkgs.mkShell {
            packages = [
              nodejs
              pkgs.pnpm
              pkgs.git
            ];

            ASTRO_TELEMETRY_DISABLED = "1";
            PNPM_HOME = ".pnpm-home";
          };
        });
    };
}

