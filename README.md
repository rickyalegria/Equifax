# Verificador de Certificados EFX - Prep & Deploy Guide

Este es el proyecto oficial del **Verificador de Certificados e Informes de Equifax**, con un panel de administración integrado y adaptado profesionalmente para ser guardado en **GitHub** y desplegado directamente en **Vercel** de manera 100% autoejecutable.

---

## 🚀 Arquitectura Híbrida Adaptada

Vercel es una plataforma serverless estática donde los sistemas de archivos tradicionales son **de solo lectura (`read-only`)**. Para que la aplicación sea totalmente operativa tanto en servidores locales tradicionales (o Cloud Run) como en Vercel, hemos diseñado un backend inteligente:

1. **Persistencia Dinámica en Serverless**: Si se detecta un entorno Vercel (`process.env.VERCEL`), la base de datos de certificados locales (`certificates.json`) y las cargas de PDF (`/uploads`) redirigen automáticamente todos sus accesos al directorio temporal escribible de AWS Lambda (`/tmp`).
2. **Semillero Automático (Auto-Seeding)**: En el arranque de cada función serverless transitoria, el backend copia las credenciales de prueba, el certificado de validación precargado (Chile) y su PDF nativo de la carpeta del repositorio directo a la carpeta temporal. **¡Por ende, el buscador y las descargas iniciales funcionarán de inmediato al ser desplegados en Vercel!**

---

## 📦 Instrucciones de Guardado en GitHub

Siga estos sencillos pasos para registrar el proyecto en su cuenta personal de GitHub:

1. **Inicialice un repositorio local de Git** (si no lo ha hecho aún) en la carpeta raíz del proyecto:
   ```bash
   git init
   ```
2. **Cree un nuevo repositorio en su panel de GitHub** (ejemplo: `verificador-equifax`).
3. **Agregue todos los archivos al índice de rastreo**:
   ```bash
   git add .
   ```
4. **Haga su primer registro o commit de código**:
   ```bash
   git commit -m "feat: setup verificador equifax con soporte fullstack vercel"
   ```
5. **Vincule el repositorio local con el remoto e inyecte los cambios**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/SU_USUARIO_DE_GITHUB/SU_REPOSITORIO.git
   git push -u origin main
   ```

---

## ⚡ Guía de Despliegue Directo de Vercel (En 3 Clics)

Dado que ya hemos configurado el archivo `vercel.json` de orquestación, Vercel detectará e indexará la aplicación a la perfección de forma automatizada:

1. Inicie sesión en su consola de [Vercel](https://vercel.com).
2. Presione el botón **"Add New"** > **"Project"**.
3. Seleccione el repositorio que acaba de subir a su cuenta de **GitHub**.
4. En **Build & Development Settings**, verifique que el framework detectado sea **Vite** (Vercel configurará automáticamente los scripts indicados de construcción).
5. **No es necesario configurar variables de entorno obligatorias** para que la app inicial compile.
6. Haga clic en **"Deploy"**.

---

## 🔧 Producción Empresarial Con Bases de Datos Externas

*Nota:* Como el directorio `/tmp` de Vercel es efímero (se borra automáticamente si la función serverless se queda inactiva por varios minutos o se reduce el tráfico), las nuevas cargas que realice en línea desde el Panel de Administrador en Vercel se borrarán eventualmente. 

Si desea mantener las cargas de forma permanente en servidores Serverless, se sugiere realizar las siguientes integraciones sencillas:
* **Para los Archivos PDF**: Migrar `multer` de disco local a clientes de almacenamiento en la nube, tales como **Vercel Blob** (nativo), **Firebase Cloud Storage**, o **Amazon S3**.
* **Para los Registros de Certificados**: Reemplazar la lectura/escritura de `certificates.json` por llamadas directas a una base de datos persistente gratuita externa, tal como **Supabase (PostgreSQL)**, **MongoDB Atlas**, o **Firebase Firestore**.
