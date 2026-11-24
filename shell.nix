{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  packages = [ pkgs.python313 ];
  LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib pkgs.libxrender pkgs.libxext pkgs.libx11 pkgs.zlib pkgs.expat ];
  shellHook = ''
    if [ ! -x .venv/bin/python ]; then
      python -m venv .venv
    fi
    source .venv/bin/activate
    python -m pip install --disable-pip-version-check -r requirements.txt
  '';
}
