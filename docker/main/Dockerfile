FROM ubuntu:24.04
ENV LANG=C.UTF-8
ENV LANGUAGE=en_US
ENV NODE_VERSION=20
ENV NVM_VERSION=v0.40.3
ENV DISPLAY=host.docker.internal:0.0
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo

RUN apt update && \
  apt upgrade -y && \
  apt install -y curl vim git&& \
  apt install -y \
    libgtk-4-dev \
    libnss3 \
    libasound2-dev \
    libxtst-dev \
    libxss1 \
    libgtk-3-0 \
    libdrm2 \
    libgbm1 \
    libcanberra-gtk* \
    rpm \
    wine \
    mono-devel &&\
  dpkg --add-architecture i386 && apt update && apt install -y wine32 && ln -s /usr/bin/wine /usr/bin/wine64

ARG USERNAME
ARG UID
ARG GID
RUN useradd -m -s /bin/bash ${USERNAME} && \
  echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \
  mkdir -p /home/${USERNAME}/app
USER ${USERNAME}
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash && \
  export NVM_DIR="/home/${USERNAME}/.nvm" && \
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
  [ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"  && \
  nvm install $NODE_VERSION
USER root
VOLUME /home/${USERNAME}/app
VOLUME /home/${USERNAME}/.vim
VOLUME /home/${USERNAME}/.vimrc
RUN chown -R ${UID}:${GID} /home/${USERNAME}
WORKDIR /home/${USERNAME}/app
CMD /etc/init.d/dbus start && tail -F /dev/null
