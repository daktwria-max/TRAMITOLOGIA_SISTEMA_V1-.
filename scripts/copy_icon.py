
# Script to copy icon
import shutil
import os

source = r"{{GENERATED_ICON_PATH}}" 
dest = r"c:/Users/kadatherion/Desktop/TRAMITOLOGIA_SISTEMA_V1/resources/icon.png"

shutil.copy2(source, dest)
