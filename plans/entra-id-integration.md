
# Integrazione Entra ID


## Requirements
1.  **Supported Account Types**: Single Tenant (Solo directory UNI).
2.  **Assignment Required**: NO (oppure assegnare il gruppo "Tutti gli utenti UNI"), per permettere l'accesso a tutto il personale autorizzato.
3.  **Redirect URI (Web)**: `http://10.1.1.11:8000/auth/v1/callback`

## Entra ID configuration

Client ID: 0e981dc6-4299-4db9-89ae-e24317c1ae2b
Tenant ID: 91ad05f9-162f-4479-ae96-5f29268cf128
Client Secret: <VEDI_ENV_FILE_SUL_SERVER>


## Reverse proxy configuration
ho fatto creare l'host athena.uni.com sul reverse proxy che gira la chiamata /auth/v1/callback sulla macchina interna alcor.uni.com porta 8000.
(Attenzione che solo dall'esterno athena.uni.com ha un record nei DNS (pubblici), e che punta all'indirizzo del proxy server UNI)