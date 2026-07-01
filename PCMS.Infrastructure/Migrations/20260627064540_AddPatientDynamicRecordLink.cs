using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientDynamicRecordLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DynamicRecordId",
                table: "Patients",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_DynamicRecordId",
                table: "Patients",
                column: "DynamicRecordId");

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_DynamicRecords_DynamicRecordId",
                table: "Patients",
                column: "DynamicRecordId",
                principalTable: "DynamicRecords",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Patients_DynamicRecords_DynamicRecordId",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_DynamicRecordId",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "DynamicRecordId",
                table: "Patients");
        }
    }
}
