// Traductions : français (source), anglais, espagnol, portugais, allemand, italien.
// Chaque clé doit exister dans toutes les langues (vérifié par tools/i18n-check.mjs).
const K = `play levels hangar profile settings level pilot tagline welcome welcomeText namePh start
lvl1 lvl2 lvl3 lvl4 lvl5 lvl6 lvl7 lvl8 lvl9 lvl10
o_finish o_orbs o_time o_hp o_hits o_nocp o_soft o_rings u_medals
stat_power stat_agility stat_armor stat_speed select selected locked toUnlock
best lockedLevel objectives pause resume restart quit crashed fromCp
levelDone time orbs hits next retry menu newHeli newRecord checkpoint repaired
tut1 tut2 tut3 tut4 ready
s_general s_audio s_controls s_display s_data s_lang s_music s_sfx s_vibe s_quality q_low q_med q_high
s_sens s_invert s_shake s_fps s_battery export import reset resetConfirm install s_about imported importErr
rank rank0 rank1 rank2 rank3 rank4 rank5 rank6 medals nextRank maxRank
st_flights st_dist st_orbs st_crashes st_time st_landings cancel confirm rings
o_stars stars refuel fueled lowFuel noFuel fromPad tut5 st_refuels
buy notEnough bought`.split(/\s+/);

const T = {
  fr: `Jouer|Niveaux|Hangar|Profil|Réglages|Niveau|Pilote|Maîtrise la gravité|Bienvenue, pilote|Choisis ton nom de pilote. Ta progression est enregistrée uniquement sur cet appareil.|Ton nom de pilote|Décoller
Aube alpine|Forêt des brumes|Canyon ocre|Côte turquoise|Métropole au crépuscule|Pics glacés|Vallée des temples|Cœur du volcan|Néon nocturne|Archipel céleste
Terminer le niveau|Récolter {v} % des pièces|Finir en moins de {v}|Finir avec au moins {v} % de blindage|{v} collisions maximum|Finir sans s'écraser|Atterrissage en douceur|Traverser tous les anneaux|Obtenir {v} médailles
Puissance|Maniabilité|Blindage|Vitesse|Choisir|Sélectionné|Verrouillé|Pour débloquer
Record|Termine le niveau {v} pour débloquer|Objectifs|Pause|Reprendre|Recommencer|Quitter|Appareil détruit|Reprendre au point de contrôle
Niveau terminé !|Temps|Pièces|Collisions|Niveau suivant|Rejouer|Menu|Nouvel hélicoptère débloqué !|Nouveau record !|Point de contrôle|Réparation
Maintiens ton pouce sur l'écran pour faire tourner le rotor|Relâche pour redescendre : dose la poussée par petites pressions|Glisse le pouce à droite pour accélérer, à gauche pour freiner|Pose-toi en douceur sur l'héliport pour terminer|Touche l'écran pour reprendre
Général|Audio|Commandes|Affichage|Données|Langue|Musique|Effets sonores|Vibrations|Qualité graphique|Basse|Moyenne|Haute
Sensibilité d'inclinaison|Inverser l'inclinaison|Tremblement d'écran|Afficher les FPS|Économie de batterie (30 FPS)|Exporter la sauvegarde|Importer une sauvegarde|Réinitialiser la progression|Effacer toute la progression ? Cette action est irréversible.|Installer l'application|100 % hors ligne · aucune pub · aucune collecte de données|Sauvegarde importée|Fichier invalide
Rang|Cadet|Pilote|Lieutenant|Capitaine|Commandant|As|Légende|Médailles|Prochain rang : {v} médailles|Rang maximal atteint
Vols|Distance parcourue|Pièces récoltées|Crashs|Temps de vol|Atterrissages réussis|Annuler|Confirmer|Anneaux
Récolter toutes les étoiles|Étoiles|Ravitaillement|Plein fait|Carburant faible|Panne sèche|Reprendre au dernier ravitaillement|Pose-toi sur les héliports verts pour refaire le plein|Ravitaillements
Acheter|Pas assez pour l'acheter|Hélicoptère acheté !`,
  en: `Play|Levels|Hangar|Profile|Settings|Level|Pilot|Master gravity|Welcome, pilot|Choose your pilot name. Your progress is saved on this device only.|Your pilot name|Take off
Alpine Dawn|Misty Forest|Ochre Canyon|Turquoise Coast|Dusk Metropolis|Frozen Peaks|Temple Valley|Heart of the Volcano|Neon Night|Sky Archipelago
Finish the level|Collect {v}% of the coins|Finish in under {v}|Finish with at least {v}% armour|{v} collisions at most|Finish without crashing|Soft landing|Fly through every ring|Earn {v} medals
Power|Handling|Armour|Speed|Select|Selected|Locked|To unlock
Best|Finish level {v} to unlock|Objectives|Paused|Resume|Restart|Quit|Aircraft destroyed|Resume from checkpoint
Level complete!|Time|Coins|Collisions|Next level|Replay|Menu|New helicopter unlocked!|New record!|Checkpoint|Repaired
Hold your thumb on the screen to spin the rotor|Release to descend: feather the thrust with short presses|Slide your thumb right to speed up, left to brake|Land gently on the helipad to finish|Touch the screen to resume
General|Audio|Controls|Display|Data|Language|Music|Sound effects|Vibration|Graphics quality|Low|Medium|High
Tilt sensitivity|Invert tilt|Screen shake|Show FPS|Battery saver (30 FPS)|Export save|Import save|Reset progress|Erase all progress? This cannot be undone.|Install the app|100% offline · no ads · no data collection|Save imported|Invalid file
Rank|Cadet|Pilot|Lieutenant|Captain|Commander|Ace|Legend|Medals|Next rank: {v} medals|Highest rank reached
Flights|Distance flown|Coins collected|Crashes|Flight time|Successful landings|Cancel|Confirm|Rings
Collect every star|Stars|Refuelling|Tank full|Low fuel|Out of fuel|Resume from last refuel stop|Land on the green helipads to refuel|Refuel stops
Buy|Not enough to buy it|Helicopter purchased!`,
  es: `Jugar|Niveles|Hangar|Perfil|Ajustes|Nivel|Piloto|Domina la gravedad|Bienvenido, piloto|Elige tu nombre de piloto. Tu progreso se guarda solo en este dispositivo.|Tu nombre de piloto|Despegar
Amanecer alpino|Bosque de niebla|Cañón ocre|Costa turquesa|Metrópolis al atardecer|Picos helados|Valle de los templos|Corazón del volcán|Noche de neón|Archipiélago celeste
Terminar el nivel|Recoger el {v} % de las monedas|Terminar en menos de {v}|Terminar con al menos {v} % de blindaje|{v} colisiones como máximo|Terminar sin estrellarse|Aterrizaje suave|Atravesar todos los anillos|Conseguir {v} medallas
Potencia|Maniobrabilidad|Blindaje|Velocidad|Elegir|Seleccionado|Bloqueado|Para desbloquear
Récord|Termina el nivel {v} para desbloquear|Objetivos|Pausa|Reanudar|Reiniciar|Salir|Aparato destruido|Reanudar desde el punto de control
¡Nivel completado!|Tiempo|Monedas|Colisiones|Siguiente nivel|Repetir|Menú|¡Nuevo helicóptero desbloqueado!|¡Nuevo récord!|Punto de control|Reparación
Mantén el pulgar en la pantalla para hacer girar el rotor|Suelta para descender: dosifica el empuje con toques cortos|Desliza el pulgar a la derecha para acelerar, a la izquierda para frenar|Aterriza suavemente en el helipuerto para terminar|Toca la pantalla para reanudar
General|Audio|Controles|Pantalla|Datos|Idioma|Música|Efectos de sonido|Vibración|Calidad gráfica|Baja|Media|Alta
Sensibilidad de inclinación|Invertir inclinación|Temblor de pantalla|Mostrar FPS|Ahorro de batería (30 FPS)|Exportar partida|Importar partida|Reiniciar progreso|¿Borrar todo el progreso? Esta acción es irreversible.|Instalar la aplicación|100 % sin conexión · sin anuncios · sin recopilación de datos|Partida importada|Archivo no válido
Rango|Cadete|Piloto|Teniente|Capitán|Comandante|As|Leyenda|Medallas|Siguiente rango: {v} medallas|Rango máximo alcanzado
Vuelos|Distancia recorrida|Monedas recogidas|Accidentes|Tiempo de vuelo|Aterrizajes logrados|Cancelar|Confirmar|Anillos
Recoger todas las estrellas|Estrellas|Repostaje|Depósito lleno|Poco combustible|Sin combustible|Reanudar desde el último repostaje|Aterriza en los helipuertos verdes para repostar|Repostajes
Comprar|No tienes suficiente|¡Helicóptero comprado!`,
  pt: `Jogar|Níveis|Hangar|Perfil|Definições|Nível|Piloto|Domina a gravidade|Bem-vindo, piloto|Escolhe o teu nome de piloto. O teu progresso é guardado apenas neste dispositivo.|O teu nome de piloto|Descolar
Aurora alpina|Floresta da névoa|Desfiladeiro ocre|Costa turquesa|Metrópole ao entardecer|Picos gelados|Vale dos templos|Coração do vulcão|Noite de néon|Arquipélago celeste
Terminar o nível|Recolher {v} % das moedas|Terminar em menos de {v}|Terminar com pelo menos {v} % de blindagem|{v} colisões no máximo|Terminar sem se despenhar|Aterragem suave|Atravessar todos os anéis|Obter {v} medalhas
Potência|Manobrabilidade|Blindagem|Velocidade|Escolher|Selecionado|Bloqueado|Para desbloquear
Recorde|Termina o nível {v} para desbloquear|Objetivos|Pausa|Retomar|Recomeçar|Sair|Aparelho destruído|Retomar no ponto de controlo
Nível concluído!|Tempo|Moedas|Colisões|Nível seguinte|Repetir|Menu|Novo helicóptero desbloqueado!|Novo recorde!|Ponto de controlo|Reparação
Mantém o polegar no ecrã para fazer girar o rotor|Solta para descer: doseia o impulso com toques curtos|Desliza o polegar para a direita para acelerar, para a esquerda para travar|Aterra suavemente no heliporto para terminar|Toca no ecrã para retomar
Geral|Áudio|Controlos|Ecrã|Dados|Idioma|Música|Efeitos sonoros|Vibração|Qualidade gráfica|Baixa|Média|Alta
Sensibilidade de inclinação|Inverter inclinação|Tremor do ecrã|Mostrar FPS|Poupança de bateria (30 FPS)|Exportar gravação|Importar gravação|Repor progresso|Apagar todo o progresso? Esta ação é irreversível.|Instalar a aplicação|100 % offline · sem anúncios · sem recolha de dados|Gravação importada|Ficheiro inválido
Patente|Cadete|Piloto|Tenente|Capitão|Comandante|Ás|Lenda|Medalhas|Próxima patente: {v} medalhas|Patente máxima atingida
Voos|Distância percorrida|Moedas recolhidas|Acidentes|Tempo de voo|Aterragens bem-sucedidas|Cancelar|Confirmar|Anéis
Recolher todas as estrelas|Estrelas|Reabastecimento|Depósito cheio|Pouco combustível|Sem combustível|Retomar no último reabastecimento|Aterra nos heliportos verdes para reabastecer|Reabastecimentos
Comprar|Não tens o suficiente|Helicóptero comprado!`,
  de: `Spielen|Level|Hangar|Profil|Einstellungen|Level|Pilot|Meistere die Schwerkraft|Willkommen, Pilot|Wähle deinen Pilotennamen. Dein Fortschritt wird nur auf diesem Gerät gespeichert.|Dein Pilotenname|Abheben
Alpenmorgen|Nebelwald|Ockercanyon|Türkisküste|Metropole in der Dämmerung|Eisgipfel|Tal der Tempel|Herz des Vulkans|Neonnacht|Himmelsarchipel
Level abschließen|{v} % der Münzen einsammeln|In unter {v} abschließen|Mit mindestens {v} % Panzerung abschließen|Höchstens {v} Kollisionen|Ohne Absturz abschließen|Sanfte Landung|Durch alle Ringe fliegen|{v} Medaillen verdienen
Leistung|Wendigkeit|Panzerung|Tempo|Wählen|Ausgewählt|Gesperrt|Zum Freischalten
Rekord|Schließe Level {v} ab, um freizuschalten|Ziele|Pause|Fortsetzen|Neu starten|Beenden|Maschine zerstört|Am Kontrollpunkt fortsetzen
Level geschafft!|Zeit|Münzen|Kollisionen|Nächstes Level|Nochmal|Menü|Neuer Helikopter freigeschaltet!|Neuer Rekord!|Kontrollpunkt|Repariert
Halte den Daumen auf dem Bildschirm, um den Rotor anzutreiben|Loslassen zum Sinken: dosiere den Schub mit kurzen Tipps|Wische nach rechts zum Beschleunigen, nach links zum Bremsen|Lande sanft auf dem Heliport, um abzuschließen|Tippe auf den Bildschirm, um fortzufahren
Allgemein|Audio|Steuerung|Anzeige|Daten|Sprache|Musik|Soundeffekte|Vibration|Grafikqualität|Niedrig|Mittel|Hoch
Neigungsempfindlichkeit|Neigung umkehren|Bildschirmwackeln|FPS anzeigen|Energiesparmodus (30 FPS)|Spielstand exportieren|Spielstand importieren|Fortschritt zurücksetzen|Gesamten Fortschritt löschen? Das kann nicht rückgängig gemacht werden.|App installieren|100 % offline · keine Werbung · keine Datenerfassung|Spielstand importiert|Ungültige Datei
Rang|Kadett|Pilot|Leutnant|Kapitän|Kommandant|Ass|Legende|Medaillen|Nächster Rang: {v} Medaillen|Höchster Rang erreicht
Flüge|Geflogene Strecke|Gesammelte Münzen|Abstürze|Flugzeit|Geglückte Landungen|Abbrechen|Bestätigen|Ringe
Alle Sterne einsammeln|Sterne|Betankung|Vollgetankt|Wenig Treibstoff|Kein Treibstoff|Am letzten Tankstopp fortsetzen|Lande auf den grünen Heliports, um zu tanken|Tankstopps
Kaufen|Nicht genug zum Kaufen|Helikopter gekauft!`,
  it: `Gioca|Livelli|Hangar|Profilo|Impostazioni|Livello|Pilota|Domina la gravità|Benvenuto, pilota|Scegli il tuo nome da pilota. I tuoi progressi sono salvati solo su questo dispositivo.|Il tuo nome da pilota|Decolla
Alba alpina|Foresta delle nebbie|Canyon ocra|Costa turchese|Metropoli al tramonto|Vette ghiacciate|Valle dei templi|Cuore del vulcano|Notte al neon|Arcipelago celeste
Completa il livello|Raccogli il {v} % delle monete|Finisci in meno di {v}|Finisci con almeno il {v} % di corazza|Massimo {v} collisioni|Finisci senza schiantarti|Atterraggio morbido|Attraversa tutti gli anelli|Ottieni {v} medaglie
Potenza|Maneggevolezza|Corazza|Velocità|Scegli|Selezionato|Bloccato|Per sbloccare
Record|Completa il livello {v} per sbloccare|Obiettivi|Pausa|Riprendi|Ricomincia|Esci|Velivolo distrutto|Riprendi dal checkpoint
Livello completato!|Tempo|Monete|Collisioni|Livello successivo|Rigioca|Menu|Nuovo elicottero sbloccato!|Nuovo record!|Checkpoint|Riparazione
Tieni il pollice sullo schermo per far girare il rotore|Rilascia per scendere: dosa la spinta con tocchi brevi|Scorri il pollice a destra per accelerare, a sinistra per frenare|Atterra dolcemente sull'eliporto per finire|Tocca lo schermo per riprendere
Generale|Audio|Comandi|Schermo|Dati|Lingua|Musica|Effetti sonori|Vibrazione|Qualità grafica|Bassa|Media|Alta
Sensibilità di inclinazione|Inverti inclinazione|Tremolio dello schermo|Mostra FPS|Risparmio batteria (30 FPS)|Esporta salvataggio|Importa salvataggio|Azzera i progressi|Cancellare tutti i progressi? L'azione è irreversibile.|Installa l'app|100 % offline · niente pubblicità · nessuna raccolta di dati|Salvataggio importato|File non valido
Grado|Cadetto|Pilota|Tenente|Capitano|Comandante|Asso|Leggenda|Medaglie|Prossimo grado: {v} medaglie|Grado massimo raggiunto
Voli|Distanza percorsa|Monete raccolte|Schianti|Tempo di volo|Atterraggi riusciti|Annulla|Conferma|Anelli
Raccogli tutte le stelle|Stelle|Rifornimento|Pieno fatto|Carburante scarso|Carburante esaurito|Riprendi dall'ultimo rifornimento|Atterra sugli eliporti verdi per fare rifornimento|Rifornimenti
Compra|Non hai abbastanza|Elicottero acquistato!`,
};

export const KEYS = K;
export const DICT = {};
for (const [lang, txt] of Object.entries(T)) {
  const vals = txt.split(/[|\n]/);
  DICT[lang] = Object.fromEntries(K.map((k, i) => [k, vals[i]]));
  DICT[lang]._n = vals.length;
}
let cur = 'fr';
export function setLang(l) { cur = DICT[l] ? l : 'en'; if (typeof document !== 'undefined') document.documentElement.lang = cur; }
export function getLang() { return cur; }
export function detectLang() {
  const n = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'fr').slice(0, 2).toLowerCase();
  return DICT[n] ? n : 'en';
}
export function t(key, v) {
  const s = DICT[cur][key] ?? DICT.fr[key] ?? key;
  return v === undefined ? s : s.replace('{v}', v);
}
