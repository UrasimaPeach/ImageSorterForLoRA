#!/bin/sh
mkdir -p "$HOME"/.vim/tmp && \
mkdir -p "$HOME"/.vim/dein && \
mkdir -p "$HOME"/.vim/bundle && \
curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
vim +PlugInstall +q +q
chmod 644 ${0}
