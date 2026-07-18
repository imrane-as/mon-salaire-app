FROM nginx:1.28-alpine

# Supprimer la page Nginx par défaut
RUN rm -rf /usr/share/nginx/html/*

# Copier les fichiers de l'application
COPY . /usr/share/nginx/html

# Appliquer notre configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]