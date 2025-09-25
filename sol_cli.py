#!/usr/bin/env python3
"""
CLI tool for processing SOL documents
A comprehensive command-line interface for Virginia SOL document processing
"""
import os
import sys
import json
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich import print as rprint

from sol_processor import SOLProcessor

console = Console()


@click.group()
@click.option('--database-url', envvar='DATABASE_URL', help='PostgreSQL database URL')
@click.option('--openai-key', envvar='OPENAI_API_KEY', help='OpenAI API key')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose logging')
@click.pass_context
def cli(ctx, database_url: Optional[str], openai_key: Optional[str], verbose: bool):
    """Virginia SOL Document Processing CLI

    Process .docx files containing SOL standards into structured database format.
    """
    ctx.ensure_object(dict)
    ctx.obj['database_url'] = database_url
    ctx.obj['openai_key'] = openai_key
    ctx.obj['verbose'] = verbose

    if verbose:
        import logging
        logging.basicConfig(level=logging.DEBUG)


@cli.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('-o', '--output', help='Output JSON file path')
@click.option('--dry-run', is_flag=True, help='Process document but don\'t save to database')
@click.pass_context
def process_file(ctx, file_path: str, output: Optional[str], dry_run: bool):
    """Process a single SOL document file"""

    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:

            task = progress.add_task("Initializing processor...", total=None)
            processor = SOLProcessor(
                database_url=ctx.obj['database_url'],
                openai_api_key=ctx.obj['openai_key']
            )

            progress.update(task, description="Extracting text from document...")
            document_text = processor.extract_text_from_docx(file_path)

            progress.update(task, description="Processing with AI...")
            sol_data = processor.process_sol_document(document_text, file_path)

            if output:
                progress.update(task, description="Saving JSON output...")
                with open(output, 'w') as f:
                    json.dump(sol_data.to_dict(), f, indent=2)
                rprint(f"💾 JSON output saved to: {output}")

            if not dry_run:
                progress.update(task, description="Saving to database...")
                saved_count = processor.save_to_database(sol_data)
                rprint(f"✅ Saved {saved_count} standards to database")
            else:
                rprint("🔍 Dry run - no data saved to database")

            progress.update(task, description="Complete!", completed=True)

        # Display results
        rprint(f"\n📊 Processing Results:")
        rprint(f"  • Document: {Path(file_path).name}")
        rprint(f"  • Subject: {sol_data.metadata.get('subject', 'Unknown')}")
        rprint(f"  • Grade Level: {sol_data.metadata.get('grade_level', 'Unknown')}")
        rprint(f"  • Standards Extracted: {len(sol_data.standards)}")

        # Show sample standards
        if sol_data.standards:
            rprint(f"\n📚 Sample Standards:")
            for i, std in enumerate(sol_data.standards[:3], 1):
                rprint(f"  {i}. {std.standard_code} - {std.strand}")
                rprint(f"     {std.description[:100]}...")

    except Exception as e:
        rprint(f"[red]❌ Error processing file: {e}[/red]")
        if ctx.obj['verbose']:
            import traceback
            traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('directory_path', type=click.Path(exists=True))
@click.option('-p', '--pattern', default='*.docx', help='File pattern to match')
@click.option('-o', '--output-dir', help='Output directory for JSON files')
@click.option('--math-only', is_flag=True, help='Process only math SOL documents')
@click.option('--science-only', is_flag=True, help='Process only science SOL documents')
@click.option('--english-only', is_flag=True, help='Process only English/literacy SOL documents')
@click.pass_context
def process_directory(ctx, directory_path: str, pattern: str, output_dir: Optional[str],
                     math_only: bool, science_only: bool, english_only: bool):
    """Process all SOL documents in a directory"""

    # Adjust pattern based on subject filters
    if math_only:
        pattern = '*[Mm]ath*.docx'
    elif science_only:
        pattern = '*[Ss]cience*.docx'
    elif english_only:
        pattern = '*[Ll]iteracy*.docx'

    try:
        processor = SOLProcessor(
            database_url=ctx.obj['database_url'],
            openai_api_key=ctx.obj['openai_key']
        )

        directory = Path(directory_path)
        files = list(directory.glob(pattern))

        if not files:
            rprint(f"❌ No files found matching pattern: {pattern}")
            return

        rprint(f"📁 Found {len(files)} files to process")

        total_saved = 0
        successful = 0

        with Progress(console=console) as progress:
            task = progress.add_task("Processing files...", total=len(files))

            for file_path in files:
                try:
                    progress.console.print(f"Processing: {file_path.name}")

                    output_path = None
                    if output_dir:
                        output_dir_path = Path(output_dir)
                        output_dir_path.mkdir(exist_ok=True)
                        output_path = output_dir_path / f"{file_path.stem}.json"

                    sol_data = processor.process_file(str(file_path), str(output_path) if output_path else None)

                    total_saved += len(sol_data.standards)
                    successful += 1

                    # Small delay to respect API rate limits
                    import time
                    time.sleep(1)

                except Exception as e:
                    rprint(f"[red]❌ Failed to process {file_path.name}: {e}[/red]")

                progress.advance(task)

        rprint(f"\n✅ Batch processing complete!")
        rprint(f"  • Files processed successfully: {successful}/{len(files)}")
        rprint(f"  • Total standards saved: {total_saved}")

    except Exception as e:
        rprint(f"[red]❌ Batch processing failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.pass_context
def validate(ctx):
    """Validate and show statistics for SOL data in database"""

    try:
        # For validation, we don't need OpenAI, so use a dummy key if not provided
        openai_key = ctx.obj['openai_key'] or 'dummy-key-for-validation'

        processor = SOLProcessor(
            database_url=ctx.obj['database_url'],
            openai_api_key=openai_key
        )

        stats = processor.get_database_stats()

        rprint(f"📊 SOL Database Statistics")
        rprint(f"Total Standards: {stats['total_standards']}")

        if stats['by_subject_grade']:
            table = Table(title="Standards by Subject and Grade")
            table.add_column("Subject", style="cyan")
            table.add_column("Grade", style="magenta")
            table.add_column("Count", style="green")

            for subject, grades in stats['by_subject_grade'].items():
                for grade, count in grades.items():
                    table.add_row(subject.title(), str(grade), str(count))

            console.print(table)
        else:
            rprint("No standards found in database")

    except Exception as e:
        rprint(f"[red]❌ Database validation failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.argument('subject', type=click.Choice(['mathematics', 'science', 'english']))
@click.argument('grade', type=str)
@click.option('--limit', default=10, help='Limit number of results')
@click.pass_context
def query(ctx, subject: str, grade: str, limit: int):
    """Query SOL standards by subject and grade"""

    try:
        from server.models import SolStandard
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        engine = create_engine(ctx.obj['database_url'])
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()

        standards = session.query(SolStandard).filter(
            SolStandard.subject == subject,
            SolStandard.grade == grade
        ).limit(limit).all()

        if not standards:
            rprint(f"❌ No standards found for {subject} grade {grade}")
            return

        rprint(f"📚 Found {len(standards)} standards for {subject.title()} Grade {grade}")

        for std in standards:
            rprint(f"\n🔹 {std.standard_code} - {std.strand}")
            rprint(f"   {std.description[:150]}...")

            if std.metadata and 'sub_objectives' in std.metadata:
                sub_count = len(std.metadata['sub_objectives'])
                if sub_count > 0:
                    rprint(f"   📝 {sub_count} sub-objectives")

        session.close()

    except Exception as e:
        rprint(f"[red]❌ Query failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.pass_context
def setup_db(ctx):
    """Initialize database tables"""

    try:
        from server.models import Base
        from sqlalchemy import create_engine

        engine = create_engine(ctx.obj['database_url'])
        Base.metadata.create_all(bind=engine)

        rprint("✅ Database tables created successfully")

    except Exception as e:
        rprint(f"[red]❌ Database setup failed: {e}[/red]")
        sys.exit(1)


if __name__ == '__main__':
    cli()